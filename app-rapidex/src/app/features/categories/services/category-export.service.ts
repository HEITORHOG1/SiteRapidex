import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import {
  CategoryAnalyticsSummary,
  CategoryUsageStats,
  ExportFormat,
  ReportConfig
} from '../models/category-analytics.models';
import {
  CategoryExportRequest,
  CategoryExportResult,
  ImportExportFormat
} from '../models/category-import-export.models';
import { Category } from '../models/category.models';
import { CategoryChartService } from './category-chart.service';
import { CategoryHttpService } from './category-http.service';

/**
 * Service for exporting category analytics data to various formats
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryExportService {
  
  constructor(
    private chartService: CategoryChartService,
    private categoryHttpService: CategoryHttpService
  ) {}

  /**
   * Export analytics data to specified format
   */
  exportAnalyticsData(
    data: CategoryAnalyticsSummary,
    format: ExportFormat,
    config?: ReportConfig
  ): Observable<Blob> {
    switch (format) {
      case 'pdf':
        return this.exportToPDF(data, config);
      case 'excel':
        return this.exportToExcel(data, config);
      case 'csv':
        return this.exportToCSV(data, config);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to PDF format
   */
  private exportToPDF(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): Observable<Blob> {
    return from(this.generatePDFReport(data, config));
  }

  /**
   * Export to Excel format
   */
  private exportToExcel(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): Observable<Blob> {
    return from(this.generateExcelReport(data, config));
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): Observable<Blob> {
    return from(this.generateCSVReport(data, config));
  }

  /**
   * Generate PDF report (simplified implementation)
   */
  private async generatePDFReport(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): Promise<Blob> {
    // This is a simplified implementation
    // In a real application, you would use a library like jsPDF or PDFKit
    
    const htmlContent = this.generateHTMLReport(data, config);
    
    // Convert HTML to PDF (simplified approach)
    // In production, you would use proper PDF generation libraries
    const pdfContent = this.htmlToPDF(htmlContent);
    
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): Promise<Blob> {
    // This is a simplified implementation
    // In a real application, you would use a library like SheetJS or ExcelJS
    
    const workbookData = this.createExcelWorkbook(data, config);
    
    // Convert to Excel format (simplified)
    const excelContent = this.createExcelBlob(workbookData);
    
    return new Blob([excelContent], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): Promise<Blob> {
    const csvContent = this.generateCSVContent(data, config);
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Generate HTML report content
   */
  private generateHTMLReport(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): string {
    const reportDate = new Date().toLocaleDateString('pt-BR');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Analytics de Categorias</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
          .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
          .metric-label { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .chart-placeholder { width: 100%; height: 300px; border: 1px solid #ddd; margin: 20px 0; display: flex; align-items: center; justify-content: center; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Analytics de Categorias</h1>
          <p>Estabelecimento ID: ${data.establishmentId}</p>
          <p>Data do Relatório: ${reportDate}</p>
          ${config?.dateRange ? `<p>Período: ${config.dateRange.startDate.toLocaleDateString('pt-BR')} - ${config.dateRange.endDate.toLocaleDateString('pt-BR')}</p>` : ''}
        </div>

        <div class="metrics">
          <div class="metric-card">
            <div class="metric-value">${data.performanceMetrics.totalCategories}</div>
            <div class="metric-label">Total de Categorias</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.performanceMetrics.activeCategories}</div>
            <div class="metric-label">Categorias Ativas</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.performanceMetrics.averageProductsPerCategory.toFixed(1)}</div>
            <div class="metric-label">Média de Produtos por Categoria</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.performanceMetrics.categoriesWithoutProducts}</div>
            <div class="metric-label">Categorias sem Produtos</div>
          </div>
        </div>

        ${config?.includeCharts ? '<div class="chart-placeholder">Gráfico de Distribuição de Produtos</div>' : ''}

        <h2>Estatísticas de Uso por Categoria</h2>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Produtos</th>
              <th>Produtos Ativos</th>
              <th>Visualizações</th>
              <th>Pedidos</th>
              <th>Receita (R$)</th>
              <th>Frequência de Uso</th>
            </tr>
          </thead>
          <tbody>
            ${data.usageStats.map(stat => `
              <tr>
                <td>${stat.categoryName}</td>
                <td>${stat.productCount}</td>
                <td>${stat.activeProductCount}</td>
                <td>${stat.totalViews}</td>
                <td>${stat.totalOrders}</td>
                <td>R$ ${stat.revenue.toFixed(2)}</td>
                <td>${this.translateUsageFrequency(stat.usageFrequency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${config?.includeCharts ? '<div class="chart-placeholder">Gráfico de Tendências</div>' : ''}

        <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
          <p>Relatório gerado automaticamente pelo Sistema Rapidex</p>
          <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate CSV content
   */
  private generateCSVContent(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): string {
    const headers = [
      'Categoria',
      'Produtos',
      'Produtos Ativos',
      'Produtos Inativos',
      'Visualizações',
      'Pedidos',
      'Receita',
      'Último Uso',
      'Frequência de Uso'
    ];

    const rows = data.usageStats.map(stat => [
      stat.categoryName,
      stat.productCount.toString(),
      stat.activeProductCount.toString(),
      stat.inactiveProductCount.toString(),
      stat.totalViews.toString(),
      stat.totalOrders.toString(),
      stat.revenue.toFixed(2),
      stat.lastUsed ? stat.lastUsed.toLocaleDateString('pt-BR') : 'Nunca',
      this.translateUsageFrequency(stat.usageFrequency)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    return '\ufeff' + csvContent;
  }

  /**
   * Create Excel workbook data structure
   */
  private createExcelWorkbook(
    data: CategoryAnalyticsSummary,
    config?: ReportConfig
  ): any {
    // Simplified Excel data structure
    // In production, use proper Excel library
    return {
      sheets: [
        {
          name: 'Resumo',
          data: [
            ['Métrica', 'Valor'],
            ['Total de Categorias', data.performanceMetrics.totalCategories],
            ['Categorias Ativas', data.performanceMetrics.activeCategories],
            ['Categorias Inativas', data.performanceMetrics.inactiveCategories],
            ['Média de Produtos por Categoria', data.performanceMetrics.averageProductsPerCategory],
            ['Categorias sem Produtos', data.performanceMetrics.categoriesWithoutProducts]
          ]
        },
        {
          name: 'Estatísticas de Uso',
          data: [
            ['Categoria', 'Produtos', 'Produtos Ativos', 'Visualizações', 'Pedidos', 'Receita', 'Frequência'],
            ...data.usageStats.map(stat => [
              stat.categoryName,
              stat.productCount,
              stat.activeProductCount,
              stat.totalViews,
              stat.totalOrders,
              stat.revenue,
              this.translateUsageFrequency(stat.usageFrequency)
            ])
          ]
        }
      ]
    };
  }

  /**
   * Create Excel blob (simplified implementation)
   */
  private createExcelBlob(workbookData: any): ArrayBuffer {
    // This is a placeholder implementation
    // In production, use a proper Excel library like SheetJS or ExcelJS
    const csvContent = workbookData.sheets.map((sheet: any) => 
      sheet.data.map((row: any[]) => row.join(',')).join('\n')
    ).join('\n\n');

    return new TextEncoder().encode(csvContent);
  }

  /**
   * Convert HTML to PDF (simplified implementation)
   */
  private htmlToPDF(html: string): ArrayBuffer {
    // This is a placeholder implementation
    // In production, use a proper PDF library like jsPDF or Puppeteer
    return new TextEncoder().encode(html);
  }

  /**
   * Translate usage frequency to Portuguese
   */
  private translateUsageFrequency(frequency: string): string {
    const translations: { [key: string]: string } = {
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa',
      'unused': 'Não utilizada'
    };
    return translations[frequency] || frequency;
  }

  /**
   * Download file with given content and filename
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export categories data for import/export functionality
   */
  exportCategories(request: CategoryExportRequest): Observable<CategoryExportResult> {
    return from(this.processExportCategories(request));
  }

  /**
   * Process category export
   */
  private async processExportCategories(request: CategoryExportRequest): Promise<CategoryExportResult> {
    try {
      // Fetch categories based on filters
      const categories = await this.fetchCategoriesForExport(request);
      
      // Generate export file
      const blob = await this.generateCategoryExportFile(categories, request);
      
      // Generate filename
      const filename = this.generateCategoryExportFilename(
        request.estabelecimentoId,
        request.format
      );

      return {
        success: true,
        filename,
        blob,
        totalCategories: categories.length,
        exportedCategories: categories.length,
        format: request.format,
        generatedAt: new Date()
      };
    } catch (error: any) {
      throw new Error(`Erro ao exportar categorias: ${error.message}`);
    }
  }

  /**
   * Fetch categories for export based on filters
   */
  private async fetchCategoriesForExport(request: CategoryExportRequest): Promise<Category[]> {
    const params: any = {
      limit: 1000 // Large limit to get all categories
    };

    if (request.filters) {
      if (request.filters.search) {
        params.search = request.filters.search;
      }
      if (request.filters.ativo !== undefined) {
        params.ativo = request.filters.ativo;
      }
      if (request.filters.categoryIds && request.filters.categoryIds.length > 0) {
        params.ids = request.filters.categoryIds.join(',');
      }
    }

    if (!request.options.includeInactive) {
      params.ativo = true;
    }

    const response = await this.categoryHttpService
      .getCategories(request.estabelecimentoId, params)
      .toPromise();

    return response?.categorias || [];
  }

  /**
   * Generate export file based on format
   */
  private async generateCategoryExportFile(
    categories: Category[],
    request: CategoryExportRequest
  ): Promise<Blob> {
    switch (request.format) {
      case 'csv':
        return this.generateCategoryCSV(categories, request.options);
      case 'excel':
        return this.generateCategoryExcel(categories, request.options);
      case 'json':
        return this.generateCategoryJSON(categories, request.options);
      default:
        throw new Error(`Formato não suportado: ${request.format}`);
    }
  }

  /**
   * Generate CSV export
   */
  private generateCategoryCSV(categories: Category[], options: any): Blob {
    const headers = ['nome', 'descricao'];
    
    if (options.includeInactive) {
      headers.push('ativo');
    }
    if (options.includeProductCount) {
      headers.push('produtosCount');
    }
    if (options.includeTimestamps) {
      headers.push('dataCriacao', 'dataAtualizacao');
    }
    if (options.includeMetadata) {
      headers.push('id', 'estabelecimentoId');
    }

    const rows = categories.map(category => {
      const row: string[] = [
        `"${category.nome}"`,
        `"${category.descricao}"`
      ];

      if (options.includeInactive) {
        row.push(category.ativo.toString());
      }
      if (options.includeProductCount) {
        row.push((category.produtosCount || 0).toString());
      }
      if (options.includeTimestamps) {
        row.push(
          `"${new Date(category.dataCriacao).toLocaleDateString('pt-BR')}"`,
          `"${new Date(category.dataAtualizacao).toLocaleDateString('pt-BR')}"`
        );
      }
      if (options.includeMetadata) {
        row.push(category.id.toString(), category.estabelecimentoId.toString());
      }

      return row.join(',');
    });

    const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Generate Excel export (simplified)
   */
  private generateCategoryExcel(categories: Category[], options: any): Blob {
    // For simplicity, generate as CSV
    // In production, use proper Excel library like SheetJS
    return this.generateCategoryCSV(categories, options);
  }

  /**
   * Generate JSON export
   */
  private generateCategoryJSON(categories: Category[], options: any): Blob {
    const exportData = categories.map(category => {
      const data: any = {
        nome: category.nome,
        descricao: category.descricao
      };

      if (options.includeInactive) {
        data.ativo = category.ativo;
      }
      if (options.includeProductCount) {
        data.produtosCount = category.produtosCount || 0;
      }
      if (options.includeTimestamps) {
        data.dataCriacao = category.dataCriacao;
        data.dataAtualizacao = category.dataAtualizacao;
      }
      if (options.includeMetadata) {
        data.id = category.id;
        data.estabelecimentoId = category.estabelecimentoId;
      }

      return data;
    });

    const jsonContent = JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalCategories: categories.length,
      categories: exportData
    }, null, 2);

    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  }

  /**
   * Generate category export filename
   */
  private generateCategoryExportFilename(
    establishmentId: number,
    format: ImportExportFormat
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'excel' ? 'xlsx' : format;
    return `categorias-${establishmentId}-${date}.${extension}`;
  }

  /**
   * Generate filename based on format and date
   */
  generateFilename(
    establishmentId: number,
    format: ExportFormat,
    prefix: string = 'category-analytics'
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'excel' ? 'xlsx' : format;
    return `${prefix}-${establishmentId}-${date}.${extension}`;
  }
}