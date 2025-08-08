import { Injectable } from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  ChartType,
  registerables
} from 'chart.js';
import {
  CategoryAnalyticsSummary,
  CategoryUsageStats,
  ChartConfig,
  TrendData,
  ProductDistributionData,
  UsageTimeData
} from '../models/category-analytics.models';

// Register Chart.js components
Chart.register(...registerables);

/**
 * Service for creating and managing charts for category analytics
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryChartService {
  private charts: Map<string, Chart> = new Map();

  /**
   * Create a category usage chart
   */
  createUsageChart(
    canvasId: string,
    usageStats: CategoryUsageStats[]
  ): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    
    if (!ctx) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    // Destroy existing chart if it exists
    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: usageStats.map(stat => stat.categoryName),
        datasets: [
          {
            label: 'Produtos Ativos',
            data: usageStats.map(stat => stat.activeProductCount),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Total de Pedidos',
            data: usageStats.map(stat => stat.totalOrders),
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Uso de Categorias - Produtos vs Pedidos'
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Número de Produtos'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Número de Pedidos'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    this.charts.set(canvasId, chart);
    return chart;
  }

  /**
   * Create a product distribution pie chart
   */
  createProductDistributionChart(
    canvasId: string,
    distributionData: ProductDistributionData[]
  ): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    
    if (!ctx) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: distributionData.map(data => data.categoryName),
        datasets: [{
          data: distributionData.map(data => data.productCount),
          backgroundColor: distributionData.map(data => data.color),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribuição de Produtos por Categoria'
          },
          legend: {
            display: true,
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const data = distributionData[context.dataIndex];
                return `${data.categoryName}: ${data.productCount} produtos (${data.percentage}%)`;
              }
            }
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    this.charts.set(canvasId, chart);
    return chart;
  }

  /**
   * Create a trend line chart
   */
  createTrendChart(
    canvasId: string,
    trendData: TrendData[],
    title: string = 'Tendência de Categorias'
  ): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    
    if (!ctx) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: trendData.map(data => data.label),
        datasets: [{
          label: 'Valor',
          data: trendData.map(data => data.value),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Valor'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Período'
            }
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    this.charts.set(canvasId, chart);
    return chart;
  }

  /**
   * Create a usage over time chart
   */
  createUsageOverTimeChart(
    canvasId: string,
    usageData: UsageTimeData[]
  ): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    
    if (!ctx) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: usageData.map(data => data.date.toLocaleDateString('pt-BR')),
        datasets: [
          {
            label: 'Visualizações',
            data: usageData.map(data => data.views),
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            borderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Pedidos',
            data: usageData.map(data => data.orders),
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Receita (R$)',
            data: usageData.map(data => data.revenue),
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Uso de Categorias ao Longo do Tempo'
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Visualizações / Pedidos'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Receita (R$)'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    this.charts.set(canvasId, chart);
    return chart;
  }

  /**
   * Create a category performance comparison chart
   */
  createPerformanceComparisonChart(
    canvasId: string,
    usageStats: CategoryUsageStats[]
  ): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    
    if (!ctx) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.destroyChart(canvasId);

    // Sort by revenue for better visualization
    const sortedStats = [...usageStats].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: sortedStats.map(stat => stat.categoryName),
        datasets: [{
          label: 'Receita (R$)',
          data: sortedStats.map(stat => stat.revenue),
          backgroundColor: sortedStats.map((_, index) => 
            `hsla(${(index * 360) / sortedStats.length}, 70%, 60%, 0.8)`
          ),
          borderColor: sortedStats.map((_, index) => 
            `hsla(${(index * 360) / sortedStats.length}, 70%, 50%, 1)`
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Categorias por Receita'
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Receita (R$)'
            }
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    this.charts.set(canvasId, chart);
    return chart;
  }

  /**
   * Update chart data
   */
  updateChart(canvasId: string, newData: any): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.data = newData;
      chart.update();
    }
  }

  /**
   * Destroy a specific chart
   */
  destroyChart(canvasId: string): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.destroy();
      this.charts.delete(canvasId);
    }
  }

  /**
   * Destroy all charts
   */
  destroyAllCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }

  /**
   * Get chart instance
   */
  getChart(canvasId: string): Chart | undefined {
    return this.charts.get(canvasId);
  }

  /**
   * Export chart as image
   */
  exportChartAsImage(canvasId: string, format: 'png' | 'jpeg' = 'png'): string | null {
    const chart = this.charts.get(canvasId);
    if (chart) {
      return chart.toBase64Image(`image/${format}`, 1.0);
    }
    return null;
  }
}