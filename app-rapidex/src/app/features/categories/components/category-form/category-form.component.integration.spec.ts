import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';

import { CategoryFormComponent } from './category-form.component';
import { CategoryHttpService } from '../../services/category-http.service';
import { CategoryValidationService, ValidationResult } from '../../services/category-validation.service';
import { CategoryValidationMessagesService } from '../../services/category-validation-messages.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Category } from '../../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category-dto.models';

// Test host component
@Component({
  template: `
    <app-category-form
      [category]="category"
      [mode]="mode"
      (formSubmit)="onFormSubmit($event)"
      (formCancel)="onFormCancel()"
      (formValid)="onFormValid($event)">
    </app-category-form>
  `
})
class TestHostComponent {
  category: Category | null = null;
  mode: 'create' | 'edit' = 'create';
  
  formSubmitData: CreateCategoryRequest | UpdateCategoryRequest | null = null;
  formCancelCalled = false;
  formValidState = false;

  onFormSubmit(data: CreateCategoryRequest | UpdateCategoryRequest): void {
    this.formSubmitData = data;
  }

  onFormCancel(): void {
    this.formCancelCalled = true;
  }

  onFormValid(isValid: boolean): void {
    this.formValidState = isValid;
  }
}

describe('CategoryFormComponent Integration Tests', () => {
  let hostComponent: TestHostComponent;
  let categoryFormComponent: CategoryFormComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  // Mock services
  let mockCategoryService: jasmine.SpyObj<CategoryHttpService>;
  let mockValidationService: jasmine.SpyObj<CategoryValidationService>;
  let mockMessagesService: jasmine.SpyObj<CategoryValidationMessagesService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  // Mock data
  const mockEstablishment = {
    id: 1,
    nomeFantasia: 'Test Restaurant',
    razaoSocial: 'Test Restaurant LTDA'
  };

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01'),
    dataAtualizacao: new Date('2024-01-01'),
    produtosCount: 5
  };

  beforeEach(async () => {
    // Create spy objects
    mockCategoryService = jasmine.createSpyObj('CategoryHttpService', [
      'createCategory',
      'updateCategory',
      'validateCategoryName'
    ]);

    mockValidationService = jasmine.createSpyObj('CategoryValidationService', [
      'validateCreateRequest',
      'validateUpdateRequest',
      'sanitizeCreateRequest',
      'sanitizeUpdateRequest'
    ]);

    mockMessagesService = jasmine.createSpyObj('CategoryValidationMessagesService', [
      'getFirstFieldErrorMessage',
      'getErrorSummaryMessage',
      'hasSecurityErrors'
    ]);

    mockEstabelecimentoService = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ], {
      selectedEstabelecimento$: new BehaviorSubject(mockEstablishment)
    });

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'info'
    ]);

    // Setup default return values
    mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);
    mockCategoryService.validateCategoryName.and.returnValue(of(true));
    mockValidationService.validateCreateRequest.and.returnValue({
      valid: true,
      errors: [],
      sanitizedData: { nome: 'Test', descricao: 'Test description' }
    });
    mockValidationService.validateUpdateRequest.and.returnValue({
      valid: true,
      errors: [],
      sanitizedData: { nome: 'Test', descricao: 'Test description', ativo: true }
    });

    await TestBed.configureTestingModule({
      imports: [
        CategoryFormComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      declarations: [TestHostComponent],
      providers: [
        { provide: CategoryHttpService, useValue: mockCategoryService },
        { provide: CategoryValidationService, useValue: mockValidationService },
        { provide: CategoryValidationMessagesService, useValue: mockMessagesService },
        { provide: EstabelecimentoService, useValue: mockEstabelecimentoService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    
    // Get the CategoryFormComponent instance
    const categoryFormDebugElement = fixture.debugElement.query(By.directive(CategoryFormComponent));
    categoryFormComponent = categoryFormDebugElement.componentInstance;

    fixture.detectChanges();
  });

  describe('Form Initialization', () => {
    it('should create and initialize form in create mode', () => {
      expect(hostComponent).toBeTruthy();
      expect(categoryFormComponent).toBeTruthy();
      expect(categoryFormComponent.isEditMode()).toBe(false);
      expect(categoryFormComponent.categoryForm).toBeTruthy();
    });

    it('should initialize form in edit mode with category data', fakeAsync(() => {
      hostComponent.mode = 'edit';
      hostComponent.category = mockCategory;
      fixture.detectChanges();

      tick();

      expect(categoryFormComponent.isEditMode()).toBe(true);
      expect(categoryFormComponent.nameControl?.value).toBe(mockCategory.nome);
      expect(categoryFormComponent.descricaoControl?.value).toBe(mockCategory.descricao);
      expect(categoryFormComponent.ativoControl?.value).toBe(mockCategory.ativo);
    }));

    it('should focus name input after view init', fakeAsync(() => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      spyOn(nameInput.nativeElement, 'focus');

      categoryFormComponent.ngAfterViewInit();
      tick(100);

      expect(nameInput.nativeElement.focus).toHaveBeenCalled();
    }));
  });

  describe('Form Validation Integration', () => {
    it('should validate required fields', fakeAsync(() => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const form = categoryFormComponent.categoryForm;

      // Clear the name field
      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      tick();
      fixture.detectChanges();

      expect(form.get('nome')?.invalid).toBe(true);
      expect(form.get('nome')?.errors?.['required']).toBeTruthy();
    }));

    it('should validate name length constraints', fakeAsync(() => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const form = categoryFormComponent.categoryForm;

      // Test minimum length
      nameInput.nativeElement.value = 'A';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      tick();
      fixture.detectChanges();

      expect(form.get('nome')?.errors?.['minlength']).toBeTruthy();

      // Test maximum length
      nameInput.nativeElement.value = 'A'.repeat(101);
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      tick();
      fixture.detectChanges();

      expect(form.get('nome')?.errors?.['maxlength']).toBeTruthy();
    }));

    it('should perform async validation for name uniqueness', fakeAsync(() => {
      mockCategoryService.validateCategoryName.and.returnValue(of(false));

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const form = categoryFormComponent.categoryForm;

      nameInput.nativeElement.value = 'Existing Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick(500); // Wait for async validation
      fixture.detectChanges();

      expect(mockCategoryService.validateCategoryName).toHaveBeenCalled();
      expect(form.get('nome')?.errors?.['nameExists']).toBeTruthy();
    }));

    it('should validate description length', fakeAsync(() => {
      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));
      const form = categoryFormComponent.categoryForm;

      // Test maximum length
      descriptionInput.nativeElement.value = 'A'.repeat(501);
      descriptionInput.nativeElement.dispatchEvent(new Event('input'));
      descriptionInput.nativeElement.dispatchEvent(new Event('blur'));

      tick();
      fixture.detectChanges();

      expect(form.get('descricao')?.errors?.['maxlength']).toBeTruthy();
    }));

    it('should emit form validity changes', fakeAsync(() => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));

      // Make form valid
      nameInput.nativeElement.value = 'Valid Category Name';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      expect(hostComponent.formValidState).toBe(true);

      // Make form invalid
      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      expect(hostComponent.formValidState).toBe(false);
    }));
  });

  describe('Form Submission Integration', () => {
    it('should submit create form with valid data', fakeAsync(() => {
      const mockCreateRequest: CreateCategoryRequest = {
        nome: 'New Category',
        descricao: 'New category description'
      };

      mockCategoryService.createCategory.and.returnValue(of(mockCategory));
      mockValidationService.sanitizeCreateRequest.and.returnValue(mockCreateRequest);

      // Fill form
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));

      nameInput.nativeElement.value = mockCreateRequest.nome;
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      descriptionInput.nativeElement.value = mockCreateRequest.descricao;
      descriptionInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      // Submit form
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(1, mockCreateRequest);
      expect(mockNotificationService.success).toHaveBeenCalledWith('Categoria criada com sucesso!');
      expect(hostComponent.formSubmitData).toEqual(mockCreateRequest);
    }));

    it('should submit update form with valid data', fakeAsync(() => {
      hostComponent.mode = 'edit';
      hostComponent.category = mockCategory;
      fixture.detectChanges();

      const mockUpdateRequest: UpdateCategoryRequest = {
        nome: 'Updated Category',
        descricao: 'Updated description',
        ativo: false
      };

      mockCategoryService.updateCategory.and.returnValue(of({ ...mockCategory, ...mockUpdateRequest }));
      mockValidationService.sanitizeUpdateRequest.and.returnValue(mockUpdateRequest);

      tick();
      fixture.detectChanges();

      // Update form
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));
      const activeCheckbox = fixture.debugElement.query(By.css('input[formControlName="ativo"]'));

      nameInput.nativeElement.value = mockUpdateRequest.nome;
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      descriptionInput.nativeElement.value = mockUpdateRequest.descricao;
      descriptionInput.nativeElement.dispatchEvent(new Event('input'));

      activeCheckbox.nativeElement.checked = mockUpdateRequest.ativo;
      activeCheckbox.nativeElement.dispatchEvent(new Event('change'));

      tick();
      fixture.detectChanges();

      // Submit form
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(1, mockCategory.id, mockUpdateRequest);
      expect(mockNotificationService.success).toHaveBeenCalledWith('Categoria atualizada com sucesso!');
      expect(hostComponent.formSubmitData).toEqual(mockUpdateRequest);
    }));

    it('should handle validation errors on submission', fakeAsync(() => {
      const validationErrors = [
        { field: 'nome', code: 'INVALID_LENGTH', message: 'Nome muito curto' }
      ];

      mockValidationService.validateCreateRequest.and.returnValue({
        valid: false,
        errors: validationErrors,
        sanitizedData: null
      });

      mockMessagesService.getErrorSummaryMessage.and.returnValue('Erro de validação');

      // Fill form with invalid data
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'A';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      // Submit form
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      expect(mockCategoryService.createCategory).not.toHaveBeenCalled();
      expect(mockMessagesService.getErrorSummaryMessage).toHaveBeenCalledWith(validationErrors);
    }));

    it('should handle server errors on submission', fakeAsync(() => {
      mockCategoryService.createCategory.and.returnValue(
        throwError(() => ({ message: 'Server error' }))
      );

      // Fill form with valid data
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Valid Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      // Submit form
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Server error');
    }));

    it('should prevent multiple submissions', fakeAsync(() => {
      mockCategoryService.createCategory.and.returnValue(of(mockCategory).pipe(
        // Simulate slow response
        delay => new Promise(resolve => setTimeout(() => resolve(delay), 1000))
      ));

      // Fill form
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Valid Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      // Submit form multiple times
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();
      submitButton.nativeElement.click();
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      expect(mockCategoryService.createCategory).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Auto-save Integration', () => {
    it('should perform auto-save in edit mode', fakeAsync(() => {
      hostComponent.mode = 'edit';
      hostComponent.category = mockCategory;
      fixture.detectChanges();

      mockCategoryService.updateCategory.and.returnValue(of(mockCategory));

      tick();
      fixture.detectChanges();

      // Change form data
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Auto-saved Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick(2000); // Wait for auto-save delay
      fixture.detectChanges();

      expect(mockCategoryService.updateCategory).toHaveBeenCalled();
      expect(mockNotificationService.info).toHaveBeenCalledWith(
        'Alterações salvas automaticamente',
        { duration: 2000 }
      );
    }));

    it('should not auto-save invalid forms', fakeAsync(() => {
      hostComponent.mode = 'edit';
      hostComponent.category = mockCategory;
      fixture.detectChanges();

      tick();
      fixture.detectChanges();

      // Make form invalid
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick(2000); // Wait for auto-save delay
      fixture.detectChanges();

      expect(mockCategoryService.updateCategory).not.toHaveBeenCalled();
    }));
  });

  describe('Form Cancellation Integration', () => {
    it('should emit cancel event when cancel button is clicked', () => {
      const cancelButton = fixture.debugElement.query(By.css('.cancel-btn'));
      if (cancelButton) {
        cancelButton.nativeElement.click();
        fixture.detectChanges();

        expect(hostComponent.formCancelCalled).toBe(true);
      }
    });

    it('should confirm cancellation when form is dirty', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(true);

      // Make form dirty
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Changed';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      categoryFormComponent.onCancel();

      expect(window.confirm).toHaveBeenCalledWith(
        'Você tem alterações não salvas. Deseja realmente cancelar?'
      );
      expect(hostComponent.formCancelCalled).toBe(true);
    }));

    it('should not cancel when user declines confirmation', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(false);

      // Make form dirty
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Changed';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      categoryFormComponent.onCancel();

      expect(window.confirm).toHaveBeenCalled();
      expect(hostComponent.formCancelCalled).toBe(false);
    }));
  });

  describe('Keyboard Navigation Integration', () => {
    it('should handle Ctrl+S for save', fakeAsync(() => {
      spyOn(categoryFormComponent, 'onSubmit');

      // Fill form with valid data
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Valid Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      // Press Ctrl+S
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      categoryFormComponent.onKeyDown(event);

      expect(categoryFormComponent.onSubmit).toHaveBeenCalled();
    }));

    it('should handle Escape for cancel', () => {
      spyOn(categoryFormComponent, 'onCancel');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      categoryFormComponent.onKeyDown(event);

      expect(categoryFormComponent.onCancel).toHaveBeenCalled();
    });

    it('should focus inputs programmatically', fakeAsync(() => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));

      spyOn(nameInput.nativeElement, 'focus');
      spyOn(descriptionInput.nativeElement, 'focus');

      categoryFormComponent.focusNameInput();
      expect(nameInput.nativeElement.focus).toHaveBeenCalled();

      categoryFormComponent.focusDescriptionInput();
      expect(descriptionInput.nativeElement.focus).toHaveBeenCalled();
    }));
  });

  describe('Error Display Integration', () => {
    it('should display field validation errors', fakeAsync(() => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));

      // Trigger validation error
      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      tick();
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('.field-error'));
      expect(errorMessage).toBeTruthy();
    }));

    it('should use validation messages service for error display', fakeAsync(() => {
      mockMessagesService.getFirstFieldErrorMessage.and.returnValue('Campo obrigatório');

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      tick();
      fixture.detectChanges();

      const errorText = categoryFormComponent.getFieldError('nome');
      expect(mockMessagesService.getFirstFieldErrorMessage).toHaveBeenCalled();
      expect(errorText).toBe('Campo obrigatório');
    }));
  });

  describe('Loading States Integration', () => {
    it('should show loading state during submission', fakeAsync(() => {
      mockCategoryService.createCategory.and.returnValue(
        of(mockCategory).pipe(
          // Simulate delay
          delay => new Promise(resolve => setTimeout(() => resolve(delay), 500))
        )
      );

      // Fill and submit form
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Valid Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick(100);
      fixture.detectChanges();

      expect(categoryFormComponent.submitting()).toBe(true);
      expect(submitButton.nativeElement.disabled).toBe(true);

      tick(500);
      fixture.detectChanges();

      expect(categoryFormComponent.submitting()).toBe(false);
    }));

    it('should show validation loading state', fakeAsync(() => {
      mockCategoryService.validateCategoryName.and.returnValue(
        of(true).pipe(
          // Simulate delay
          delay => new Promise(resolve => setTimeout(() => resolve(delay), 300))
        )
      );

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Category Name';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick(100);
      fixture.detectChanges();

      expect(categoryFormComponent.validatingName()).toBe(true);

      tick(300);
      fixture.detectChanges();

      expect(categoryFormComponent.validatingName()).toBe(false);
    }));
  });

  describe('Accessibility Integration', () => {
    it('should have proper ARIA attributes', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      expect(nameInput.nativeElement.getAttribute('aria-required')).toBe('true');
      expect(nameInput.nativeElement.getAttribute('aria-describedby')).toContain('name-help');

      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));
      expect(descriptionInput.nativeElement.getAttribute('aria-describedby')).toContain('description-help');
    }));

    it('should announce form submission results', fakeAsync(() => {
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');

      mockCategoryService.createCategory.and.returnValue(of(mockCategory));

      // Fill and submit form
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Valid Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      expect(document.body.appendChild).toHaveBeenCalled();
    }));
  });

  describe('Component State Integration', () => {
    it('should properly manage component state signals', fakeAsync(() => {
      expect(categoryFormComponent.loading()).toBe(false);
      expect(categoryFormComponent.submitting()).toBe(false);
      expect(categoryFormComponent.validatingName()).toBe(false);
      expect(categoryFormComponent.autoSaving()).toBe(false);

      // Test state changes during operations
      mockCategoryService.createCategory.and.returnValue(of(mockCategory));

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Valid Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      // Check submitting state
      expect(categoryFormComponent.submitting()).toBe(true);

      tick();
      fixture.detectChanges();

      expect(categoryFormComponent.submitting()).toBe(false);
    }));

    it('should compute canSubmit correctly', fakeAsync(() => {
      // Initially should not be able to submit (empty form)
      expect(categoryFormComponent.canSubmit()).toBe(false);

      // Fill form with valid data
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Valid Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      expect(categoryFormComponent.canSubmit()).toBe(true);

      // Make form invalid
      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      expect(categoryFormComponent.canSubmit()).toBe(false);
    }));
  });
});