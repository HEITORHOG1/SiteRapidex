import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorMessageComponent } from './error-message';

describe('ErrorMessageComponent', () => {
  let component: ErrorMessageComponent;
  let fixture: ComponentFixture<ErrorMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorMessageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorMessageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default type as error', () => {
    expect(component.type).toBe('error');
  });

  it('should not show retry button by default', () => {
    expect(component.showRetry).toBe(false);
  });

  it('should not be dismissible by default', () => {
    expect(component.dismissible).toBe(false);
  });

  it('should display the message', () => {
    component.message = 'Test error message';
    fixture.detectChanges();

    const messageElement = fixture.nativeElement.querySelector('.error-message__message');
    expect(messageElement.textContent.trim()).toBe('Test error message');
  });

  it('should apply correct CSS class for error type', () => {
    component.type = 'error';
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.error-message--error');
    expect(container).toBeTruthy();
  });

  it('should apply correct CSS class for warning type', () => {
    component.type = 'warning';
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.error-message--warning');
    expect(container).toBeTruthy();
  });

  it('should apply correct CSS class for info type', () => {
    component.type = 'info';
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.error-message--info');
    expect(container).toBeTruthy();
  });

  it('should show retry button when showRetry is true', () => {
    component.showRetry = true;
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('.error-message__button--retry');
    expect(retryButton).toBeTruthy();
  });

  it('should show dismiss button when dismissible is true', () => {
    component.dismissible = true;
    fixture.detectChanges();

    const dismissButton = fixture.nativeElement.querySelector('.error-message__button--dismiss');
    expect(dismissButton).toBeTruthy();
  });

  it('should emit retry event when retry button is clicked', () => {
    spyOn(component.retry, 'emit');
    component.showRetry = true;
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('.error-message__button--retry');
    retryButton.click();

    expect(component.retry.emit).toHaveBeenCalled();
  });

  it('should emit dismiss event when dismiss button is clicked', () => {
    spyOn(component.dismiss, 'emit');
    component.dismissible = true;
    fixture.detectChanges();

    const dismissButton = fixture.nativeElement.querySelector('.error-message__button--dismiss');
    dismissButton.click();

    expect(component.dismiss.emit).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    component.message = 'Error message';
    component.type = 'error';
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.error-message');
    expect(container.getAttribute('role')).toBe('alert');
    expect(container.getAttribute('aria-live')).toBe('assertive');
  });

  it('should use polite aria-live for non-error types', () => {
    component.type = 'info';
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.error-message');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });

  it('should return correct icon path for each type', () => {
    expect(component.iconPath).toContain('M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'); // error icon

    component.type = 'warning';
    expect(component.iconPath).toContain('M12 9v3.75m-9.303 3.376c'); // warning icon

    component.type = 'info';
    expect(component.iconPath).toContain('M11.25 11.25l.041-.02a.75.75 0 011.063.852l'); // info icon
  });
});