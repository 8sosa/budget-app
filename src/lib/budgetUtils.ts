import prisma from "@/lib/prisma";

export async function getBudgetForPeriod(email: string, month: number, year: number) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      // Fetch ONLY the requested month's data
      monthlyCaps: { where: { month, year } },
      budgets: { where: { month, year } }
    }
  });

  if (!user) throw new Error("User not found");

  // A. DATA EXISTS: Return it immediately
  if (user.monthlyCaps.length > 0 || user.budgets.length > 0) {
    return {
      globalLimit: user.monthlyCaps[0]?.amount || user.defaultMonthlyBudget,
      categories: user.budgets
    };
  }

  // B. NO DATA: Try to Copy from Previous Month (Auto-Carryover)
  // Find the most recent budget data
  const lastBudget = await prisma.budget.findFirst({
    where: { userId: user.id },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  
  const lastCap = await prisma.monthlyCap.findFirst({
    where: { userId: user.id },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  // If we found history, CLONE it to the new month
  if (lastBudget || lastCap) {
    const prevMonth = lastBudget?.month ?? month;
    const prevYear = lastBudget?.year ?? year;

    const prevCategories = await prisma.budget.findMany({
      where: { userId: user.id, month: prevMonth, year: prevYear }
    });

    // Save the clone to DB so the user can edit it later
    await prisma.$transaction([
       prisma.monthlyCap.create({
         data: {
           userId: user.id,
           month,
           year,
           amount: lastCap?.amount || user.defaultMonthlyBudget
         }
       }),
       ...prevCategories.map(cat => 
         prisma.budget.create({
           data: {
             userId: user.id,
             category: cat.category,
             limit: cat.limit,
             month, 
             year
           }
         })
       )
    ]);

    // Recursive call to fetch the newly created data
    return getBudgetForPeriod(email, month, year);
  }

  // C. FRESH USER: Return Defaults
  return {
    globalLimit: user.defaultMonthlyBudget,
    categories: []
  };
}

export async function getYearlyTotalLimit(email: string, year: number) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      // Fetch all monthly caps for this specific year
      monthlyCaps: {
        where: { year },
        orderBy: { month: 'asc' }
      }
    }
  });

  if (!user) return 0;

  let totalYearlyLimit = 0;
  
  // Start with the user's default, or 0 if not set
  let lastKnownLimit = user.defaultMonthlyBudget || 0;

  // Loop through all 12 months (0 to 11)
  for (let m = 0; m < 12; m++) {
    // Check if we have a specific cap saved for this month
    const cap = user.monthlyCaps.find(c => c.month === m);

    if (cap) {
      // If yes, update our "current" limit
      lastKnownLimit = cap.amount;
    }
    
    // Add to the running total
    // (If cap was found, we add that. If not, we add the previous month's value)
    totalYearlyLimit += lastKnownLimit;
  }

  return totalYearlyLimit;
}