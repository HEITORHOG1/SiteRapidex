import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, delay } from 'rxjs';

import { CategoryFormComponent } from './category-form.component';
import { CategoryHttpService } from '../../services/category-http.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Category } from '../../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category-dto.models';
import { Estabelecimento } from '../../../../data-access/models/estabelecimento.models';

describe('CategoryFormComponent', () => {
  let component: CategoryFormComponent;
  let fixture: ComponentFixture<CategoryFormComponent>;
  let categoryService: jasmine.SpyObj<CategoryHttpService>;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockEstablishment: Estabelecimento = {
    id: 1,
    usuarioId: 'user123',
    razaoSocial: 'Test Establishment Ltda',
    nomeFantasia: 'Test Establishment',
    cnpj: '12345678000123',
    telefone: '123456789',
    endereco: 'Test Address',
    status: true,
    cep: '12345678',
    numero: '123',
    dataCadastro: '2024-01-01',
    latitude: -23.5505,
    longitude: -46.6333,
    raioEntregaKm: 5,
    taxaEntregaFixa: 5.00,
    descricao: 'Test establishment description'
  };

  const mockCategory: Category = {
    id: 1,
    nome: 'Test Category',
    descricao: 'Test Description',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
    produtosCount: 0
  };

  beforeEach(async () => {
    const categoryServiceSpy = jasmine.createSpyObj('CategoryHttpService', [
      'createCategory',
      'updateCategory',
      'validateCategoryName'
    ]);

    const estabelecimentoServiceSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ], {
      selectedEstabelecimento$: of(mockEstablishment)
    });

    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'info'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        CategoryFormComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: CategoryHttpService, useValue: categoryServiceSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    categoryService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    // Setup default spy returns
    categoryService.validateCategoryName.and.returnValue(of(true));
    estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form in create mode by default', () => {
      fixture.detectChanges();
      
      expect(component.mode).toBe('create');
      expect(component.isEditMode()).toBeFalse();
      expect(component.categoryForm).toBeDefined();
      expect(component.categoryForm.get('nome')).toBeTruthy();
      expect(component.categoryForm.get('descricao')).toBeTruthy();
      expect(component.categoryForm.get('ativo')).toBeFalsy(); // Not present in create mode
    });

    it('should initialize form in edit mode when mode is set', () => {
      component.mode = 'edit';
      fixture.detectChanges();
      
      expect(component.isEditMode()).toBeTrue();
      expect(component.categoryForm.get('ativo')).toBeTruthy(); // Present in edit mode
    });

    it('should populate form when category is provided in edit mode', () => {
      component.mode = 'edit';
      component.category = mockCategory;
      fixture.detectChanges();
      
      expect(component.categoryForm.get('nome')?.value).toBe(mockCategory.nome);
      expect(component.categoryForm.get('descricao')?.value).toBe(mockCategory.descricao);
      expect(component.categoryForm.get('ativo')?.value).toBe(mockCategory.ativo);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should require nome field', () => {
      const nomeControl = component.categoryForm.get('nome');
      
      nomeControl?.setValue('');
      nomeControl?.markAsTouched();
      
      expect(nomeControl?.hasError('required')).toBeTrue();
      expect(component.getFieldError('nome')).toBe('Nome é obrigatório');
    });

    it('should validate nome minimum length', () => {
      const nomeControl = component.categoryForm.get('nome');
      
      nomeControl?.setValue('a');
      nomeControl?.markAsTouched();
      
      expect(nomeControl?.hasError('minlength')).toBeTrue();
      expect(component.getFieldError('nome')).toBe('Nome deve ter pelo menos 2 caracteres');
    });

    it('should validate nome maximum length', () => {
      const nomeControl = component.categoryForm.get('nome');
      const longName = 'a'.repeat(101);
      
      nomeControl?.setValue(longName);
      nomeControl?.markAsTouched();
      
      expect(nomeControl?.hasError('maxlength')).toBeTrue();
      expect(component.getFieldError('nome')).toBe('Nome deve ter no máximo 100 caracteres');
    });

    it('should validate descricao maximum length', () => {
      const descricaoControl = component.categoryForm.get('descricao');
      const longDescription = 'a'.repeat(501);
      
      descricaoControl?.setValue(longDescription);
      descricaoControl?.markAsTouched();
      
      expect(descricaoControl?.hasError('maxlength')).toBeTrue();
      expect(component.getFieldError('descricao')).toBe('Descrição deve ter no máximo 500 caracteres');
    });

    it('should prevent script injection in nome', () => {
      const nomeControl = component.categoryForm.get('nome');
      
      nomeControl?.setValue('<script>alert("xss")</script>');
      nomeControl?.markAsTouched();
      
      expect(nomeControl?.hasError('script')).toBeTrue();
      expect(component.getFieldError('nome')).toBe('Scripts não são permitidos');
    });

    it('should prevent HTML injection in descricao', () => {
      const descricaoControl = component.categoryForm.get('descricao');
      
      descricaoControl?.setValue('<div>test</div>');
      descricaoControl?.markAsTouched();
      
      expect(descricaoControl?.hasError('html')).toBeTrue();
      expect(component.getFieldError('descricao')).toBe('Tags HTML não são permitidas');
    });

    it('should perform async validation for unique name', fakeAsync(() => {
      categoryService.validateCategoryName.and.returnValue(of(false).pipe(delay(100)));
      
      const nomeControl = component.categoryForm.get('nome');
      nomeControl?.setValue('Existing Category');
      
      tick(100);
      
      expect(categoryService.validateCategoryName).toHaveBeenCalledWith(
        mockEstablishment.id,
        'Existing Category',
        undefined
      );
      expect(nomeControl?.hasError('unique')).toBeTrue();
    }));
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create category when form is valid in create mode', fakeAsync(() => {
      const createRequest: CreateCategoryRequest = {
        nome: 'New Category',
        descricao: 'New Description'
      };
      
      categoryService.createCategory.and.returnValue(of(mockCategory));
      
      component.categoryForm.patchValue(createRequest);
      component.onSubmit();
      
      tick();
      
      expect(categoryService.createCategory).toHaveBeenCalledWith(
        mockEstablishment.id,
        jasmine.objectContaining(createRequest)
      );
      expect(notificationService.success).toHaveBeenCalledWith('Categoria criada com sucesso!');
      expect(component.formSubmit.emit).toHaveBeenCalled();
    }));

    it('should update category when form is valid in edit mode', fakeAsync(() => {
      component.mode = 'edit';
      component.category = mockCategory;
      fixture.detectChanges();
      
      const updateRequest: UpdateCategoryRequest = {
        nome: 'Updated Category',
        descricao: 'Updated Description',
        ativo: false
      };
      
      categoryService.updateCategory.and.returnValue(of({ ...mockCategory, ...updateRequest }));
      
      component.categoryForm.patchValue(updateRequest);
      component.onSubmit();
      
      tick();
      
      expect(categoryService.updateCategory).toHaveBeenCalledWith(
        mockEstablishment.id,
        mockCategory.id,
        jasmine.objectContaining(updateRequest)
      );
      expect(notificationService.success).toHaveBeenCalledWith('Categoria atualizada com sucesso!');
      expect(component.formSubmit.emit).toHaveBeenCalled();
    }));

    it('should not submit when form is invalid', () => {
      component.categoryForm.get('nome')?.setValue(''); // Invalid
      component.onSubmit();
      
      expect(categoryService.createCategory).not.toHaveBeenCalled();
      expect(categoryService.updateCategory).not.toHaveBeenCalled();
    });

    it('should handle submission errors', fakeAsync(() => {
      const error = { message: 'Server error', code: 'SERVER_ERROR' };
      categoryService.createCategory.and.returnValue(throwError(() => error));
      
      component.categoryForm.patchValue({
        nome: 'Test Category',
        descricao: 'Test Description'
      });
      
      component.onSubmit();
      tick();
      
      expect(notificationService.error).toHaveBeenCalledWith('Server error');
      expect(component.submitting()).toBeFalse();
    }));

    it('should sanitize form data before submission', fakeAsync(() => {
      const maliciousData = {
        nome: '<script>alert("xss")</script>Test Category',
        descricao: 'javascript:alert("xss")Test Description'
      };
      
      categoryService.createCategory.and.returnValue(of(mockCategory));
      
      // Bypass form validation for this test
      spyOnProperty(component.categoryForm, 'valid', 'get').and.returnValue(true);
      component.categoryForm.patchValue(maliciousData);
      
      component.onSubmit();
      tick();
      
      expect(categoryService.createCategory).toHaveBeenCalledWith(
        mockEstablishment.id,
        jasmine.objectContaining({
          nome: 'Test Category', // Sanitized
          descricao: 'Test Description' // Sanitized
        })
      );
    }));
  });

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      component.mode = 'edit';
      component.category = mockCategory;
      fixture.detectChanges();
    });

    it('should auto-save after form changes in edit mode', fakeAsync(() => {
      categoryService.updateCategory.and.returnValue(of(mockCategory));
      
      component.categoryForm.patchValue({
        nome: 'Auto-saved Category',
        descricao: 'Auto-saved Description',
        ativo: true
      });
      
      tick(2100); // Wait for auto-save delay + buffer
      
      expect(categoryService.updateCategory).toHaveBeenCalled();
      expect(notificationService.info).toHaveBeenCalledWith(
        'Alterações salvas automaticamente',
        { duration: 2000 }
      );
    }));

    it('should not auto-save in create mode', fakeAsync(() => {
      component.mode = 'create';
      fixture.detectChanges();
      
      component.categoryForm.patchValue({
        nome: 'New Category',
        descricao: 'New Description'
      });
      
      tick(2100);
      
      expect(categoryService.updateCategory).not.toHaveBeenCalled();
    }));

    it('should not auto-save when form is invalid', fakeAsync(() => {
      component.categoryForm.patchValue({
        nome: '', // Invalid
        descricao: 'Description'
      });
      
      tick(2100);
      
      expect(categoryService.updateCategory).not.toHaveBeenCalled();
    }));
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should focus name input after view init', fakeAsync(() => {
      spyOn(component, 'focusNameInput');
      
      component.ngAfterViewInit();
      tick(150);
      
      expect(component.focusNameInput).toHaveBeenCalled();
    }));

    it('should handle keyboard shortcuts', () => {
      spyOn(component, 'onSubmit');
      spyOn(component, 'onCancel');
      
      // Test Ctrl+S for save
      const ctrlSEvent = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      component.onKeyDown(ctrlSEvent);
      
      expect(component.onSubmit).toHaveBeenCalled();
      
      // Test Escape for cancel
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeyDown(escapeEvent);
      
      expect(component.onCancel).toHaveBeenCalled();
    });

    it('should announce actions to screen readers', () => {
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      
      // Use reflection to access private method
      const announceMethod = (component as any).announceToScreenReader;
      announceMethod.call(component, 'Test message');
      
      expect(document.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('Form Cancellation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit cancel event when form is clean', () => {
      spyOn(component.formCancel, 'emit');
      
      component.onCancel();
      
      expect(component.formCancel.emit).toHaveBeenCalled();
    });

    it('should confirm cancellation when form is dirty', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component.formCancel, 'emit');
      
      component.categoryForm.markAsDirty();
      component.onCancel();
      
      expect(window.confirm).toHaveBeenCalledWith(
        'Você tem alterações não salvas. Deseja realmente cancelar?'
      );
      expect(component.formCancel.emit).toHaveBeenCalled();
    });

    it('should not cancel when user declines confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      spyOn(component.formCancel, 'emit');
      
      component.categoryForm.markAsDirty();
      component.onCancel();
      
      expect(component.formCancel.emit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return null for valid fields', () => {
      const nomeControl = component.categoryForm.get('nome');
      nomeControl?.setValue('Valid Name');
      
      expect(component.getFieldError('nome')).toBeNull();
    });

    it('should return null for untouched fields with errors', () => {
      const nomeControl = component.categoryForm.get('nome');
      nomeControl?.setValue(''); // Invalid but not touched
      
      expect(component.getFieldError('nome')).toBeNull();
    });

    it('should handle establishment validation errors', fakeAsync(() => {
      // Create a new spy with null establishment
      const nullEstablishmentSpy = jasmine.createSpyObj('EstabelecimentoService', [
        'getSelectedEstabelecimento'
      ], {
        selectedEstabelecimento$: of(null)
      });
      
      // Replace the service in the component
      (component as any).estabelecimentoService = nullEstablishmentSpy;
      
      const nomeControl = component.categoryForm.get('nome');
      nomeControl?.setValue('Test Category');
      
      tick(100);
      
      expect(nomeControl?.hasError('establishment')).toBeTrue();
    }));
  });

  describe('Component State Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should track loading state', () => {
      expect(component.loading()).toBeFalse();
      
      component.loading.set(true);
      expect(component.loading()).toBeTrue();
    });

    it('should track submitting state', () => {
      expect(component.submitting()).toBeFalse();
      
      component.submitting.set(true);
      expect(component.submitting()).toBeTrue();
    });

    it('should track name validation state', () => {
      expect(component.validatingName()).toBeFalse();
      
      component.validatingName.set(true);
      expect(component.validatingName()).toBeTrue();
    });

    it('should compute canSubmit correctly', () => {
      // Valid form, not loading/submitting
      component.categoryForm.patchValue({
        nome: 'Valid Category',
        descricao: 'Valid Description'
      });
      
      expect(component.canSubmit()).toBeTrue();
      
      // Invalid form
      component.categoryForm.get('nome')?.setValue('');
      expect(component.canSubmit()).toBeFalse();
      
      // Loading state
      component.categoryForm.get('nome')?.setValue('Valid Category');
      component.submitting.set(true);
      expect(component.canSubmit()).toBeFalse();
    });
  });
});