import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryFormComponent } from './category-form.component';
import { Category } from '../../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category-dto.models';

/**
 * Demo component to showcase CategoryFormComponent functionality
 * This demonstrates both create and edit modes
 */
@Component({
  selector: 'app-category-form-demo',
  standalone: true,
  imports: [CommonModule, CategoryFormComponent],
  template: `
    <div class="demo-container">
      <h1>Category Form Demo</h1>
      
      <div class="demo-section">
        <h2>Create Mode</h2>
        <app-category-form
          mode="create"
          (formSubmit)="onCreateSubmit($event)"
          (formCancel)="onCancel()"
          (formValid)="onValidityChange('create', $event)"
        ></app-category-form>
        
        <div class="demo-info">
          <p><strong>Form Valid:</strong> {{ createFormValid() ? 'Yes' : 'No' }}</p>
          <p><strong>Last Submission:</strong> {{ lastCreateSubmission() || 'None' }}</p>
        </div>
      </div>

      <div class="demo-section">
        <h2>Edit Mode</h2>
        <app-category-form
          mode="edit"
          [category]="sampleCategory()"
          (formSubmit)="onEditSubmit($event)"
          (formCancel)="onCancel()"
          (formValid)="onValidityChange('edit', $event)"
        ></app-category-form>
        
        <div class="demo-info">
          <p><strong>Form Valid:</strong> {{ editFormValid() ? 'Yes' : 'No' }}</p>
          <p><strong>Last Submission:</strong> {{ lastEditSubmission() || 'None' }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .demo-section {
      margin-bottom: 3rem;
      padding: 2rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }

    .demo-section h2 {
      margin-top: 0;
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 0.5rem;
    }

    .demo-info {
      margin-top: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }

    .demo-info p {
      margin: 0.5rem 0;
      font-family: monospace;
    }
  `]
})
export class CategoryFormDemoComponent {
  // Form validity tracking
  createFormValid = signal(false);
  editFormValid = signal(false);
  
  // Submission tracking
  lastCreateSubmission = signal<string | null>(null);
  lastEditSubmission = signal<string | null>(null);

  // Sample category for edit mode
  sampleCategory = signal<Category>({
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria para bebidas em geral',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01'),
    dataAtualizacao: new Date('2024-01-15'),
    produtosCount: 5
  });

  onCreateSubmit(request: CreateCategoryRequest): void {
    console.log('Create submission:', request);
    this.lastCreateSubmission.set(JSON.stringify(request, null, 2));
  }

  onEditSubmit(request: CreateCategoryRequest | UpdateCategoryRequest): void {
    console.log('Edit submission:', request);
    this.lastEditSubmission.set(JSON.stringify(request, null, 2));
  }

  onCancel(): void {
    console.log('Form cancelled');
  }

  onValidityChange(mode: 'create' | 'edit', isValid: boolean): void {
    if (mode === 'create') {
      this.createFormValid.set(isValid);
    } else {
      this.editFormValid.set(isValid);
    }
  }
}