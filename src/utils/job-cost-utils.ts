export const LABOR_BURDEN_MULTIPLIER = 1.2;

const roundCurrency = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export const buildCostPercent = (value: number, base: number) => {
  if (!base) return 0;
  return roundCurrency((value / base) * 100);
};

export const buildJobCostSummary = ({
  jobPrice = 0,
  painterDailyHours = [],
  materialExpenses = [],
}: {
  jobPrice?: number;
  painterDailyHours?: Array<any>;
  materialExpenses?: Array<any>;
}) => {
  const totalLoggedHours = painterDailyHours.reduce((total, entry) => {
    const hours = Array.isArray(entry?.painterHours)
      ? entry.painterHours.reduce(
          (sum: number, painterEntry: any) => sum + Number(painterEntry?.hours || 0),
          0
        )
      : 0;
    return total + hours;
  }, 0);

  const directLaborCost = painterDailyHours.reduce((total, entry) => {
    const hours = Array.isArray(entry?.painterHours)
      ? entry.painterHours.reduce((sum: number, painterEntry: any) => {
          const hourlyRate = Number(
            painterEntry?.painter?.hourlyRate ??
              painterEntry?.hourlyRate ??
              0
          );
          return sum + Number(painterEntry?.hours || 0) * hourlyRate;
        }, 0)
      : 0;
    return total + hours;
  }, 0);

  const burdenedLaborCost = directLaborCost * LABOR_BURDEN_MULTIPLIER;
  const materialCost = materialExpenses.reduce(
    (total: number, entry: any) => total + Number(entry?.amount || 0),
    0
  );
  const totalCost = burdenedLaborCost + materialCost;
  const grossProfit = Number(jobPrice || 0) - totalCost;
  const positiveProfit = Math.max(grossProfit, 0);
  const overBudget = Math.max(-grossProfit, 0);

  return {
    jobPrice: roundCurrency(jobPrice),
    totalLoggedHours: roundCurrency(totalLoggedHours),
    directLaborCost: roundCurrency(directLaborCost),
    laborCost: roundCurrency(burdenedLaborCost),
    burdenMultiplier: LABOR_BURDEN_MULTIPLIER,
    materialCost: roundCurrency(materialCost),
    totalCost: roundCurrency(totalCost),
    grossProfit: roundCurrency(grossProfit),
    grossProfitMarginPercent: buildCostPercent(grossProfit, Number(jobPrice || 0)),
    laborPercentOfPrice: buildCostPercent(burdenedLaborCost, Number(jobPrice || 0)),
    materialPercentOfPrice: buildCostPercent(materialCost, Number(jobPrice || 0)),
    totalCostPercentOfPrice: buildCostPercent(totalCost, Number(jobPrice || 0)),
    overBudget: roundCurrency(overBudget),
    chartSegments: [
      {
        key: "labor",
        label: "Labor Cost",
        value: roundCurrency(burdenedLaborCost),
        percentOfPrice: buildCostPercent(burdenedLaborCost, Number(jobPrice || 0)),
      },
      {
        key: "materials",
        label: "Material Cost",
        value: roundCurrency(materialCost),
        percentOfPrice: buildCostPercent(materialCost, Number(jobPrice || 0)),
      },
      ...(positiveProfit > 0
        ? [
            {
              key: "profit",
              label: "Gross Profit",
              value: roundCurrency(positiveProfit),
              percentOfPrice: buildCostPercent(positiveProfit, Number(jobPrice || 0)),
            },
          ]
        : []),
      ...(overBudget > 0
        ? [
            {
              key: "overBudget",
              label: "Over Budget",
              value: roundCurrency(overBudget),
              percentOfPrice: buildCostPercent(overBudget, Number(jobPrice || 0)),
            },
          ]
        : []),
    ],
  };
};
