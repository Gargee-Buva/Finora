//bar chart - ui.shadcn.com/charts
import * as React from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useChartAnalyticsQuery } from "@/features/analytics/analyticsAPI";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format-currency";
import { DateRangeType } from "@/components/date-range-select";

interface PropsType {
  dateRange?: DateRangeType;
}

const COLORS = ["var(--primary)", "var(--color-destructive)"];

const chartConfig = {
  income: {
    label: "Income",
    color: COLORS[0],
  },
  expenses: {
    label: "Expenses",
    color: COLORS[1],
  },
} satisfies ChartConfig;

const DashboardDataChart: React.FC<PropsType> = ({ dateRange }) => {
  const isMobile = useIsMobile();

  const { data, isFetching } = useChartAnalyticsQuery({
    preset: dateRange?.value,
  });

  const chartData = data?.data?.chartData ?? [];
  const totalIncomeCount = data?.data?.totalIncomeCount ?? 0;
  const totalExpenseCount = data?.data?.totalExpenseCount ?? 0;

  if (isFetching) {
    return <ChartSkeleton />;
  }

  return (
    <Card className="!shadow-none border border-gray-100 dark:border-border !pt-0">
      <CardHeader className="flex flex-col sm:flex-row items-stretch border-b border-gray-100 dark:border-border !p-0 pr-1">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-2">
          <CardTitle className="text-lg">Transaction Overview</CardTitle>
          <CardDescription>
            Showing total transactions {dateRange?.label}
          </CardDescription>
        </div>

        <div className="flex">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 text-center sm:border-l border-gray-100 dark:border-border min-w-36">
            <span className="text-xs text-muted-foreground">No of Income</span>
            <span className="flex items-center justify-center gap-2 text-lg font-semibold">
              <TrendingUpIcon className="size-3 text-primary" />
              {totalIncomeCount}
            </span>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 text-center sm:border-l border-gray-100 dark:border-border min-w-36">
            <span className="text-xs text-muted-foreground">No of Expenses</span>
            <span className="flex items-center justify-center gap-2 text-lg font-semibold">
              <TrendingDownIcon className="size-3 text-destructive" />
              {totalExpenseCount}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 h-[300px]">
        {chartData.length === 0 ? (
          <EmptyState
            title="No transaction data"
            description="There are no transactions recorded for this period."
          />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={isMobile ? 20 : 30}
                tickFormatter={(value) =>
                  format(new Date(value), isMobile ? "MMM d" : "MMM dd")
                }
              />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      format(new Date(value), "MMM d, yyyy")
                    }
                    formatter={(value, name) => {
                      const isExpense = name === "expenses";
                      return [
                        formatCurrency(Number(value), {
                          compact: true,
                          showSign: true,
                          isExpense,
                        }),
                        isExpense ? "Expenses" : "Income",
                      ];
                    }}
                  />
                }
              />

              <defs>
                <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.1} />
                </linearGradient>

                <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <Area
                dataKey="expenses"
                type="natural"
                fill="url(#fillExpenses)"
                stroke={COLORS[1]}
                strokeWidth={2}
                stackId="a"
              />

              <Area
                dataKey="income"
                type="natural"
                fill="url(#fillIncome)"
                stroke={COLORS[0]}
                strokeWidth={2}
                stackId="a"
              />

              <ChartLegend
                verticalAlign="bottom"
                content={<ChartLegendContent />}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

const ChartSkeleton = () => (
  <Card className="!shadow-none border border-gray-100 dark:border-border !pt-0">
    <CardHeader className="border-b border-gray-100 dark:border-border">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32 mt-2" />
    </CardHeader>
    <CardContent className="h-[280px]">
      <Skeleton className="h-full w-full" />
    </CardContent>
  </Card>
);

export default DashboardDataChart;
