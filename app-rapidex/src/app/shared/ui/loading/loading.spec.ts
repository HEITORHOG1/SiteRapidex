import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default size as medium', () => {
    expect(component.size).toBe('medium');
  });

  it('should not have overlay by default', () => {
    expect(component.overlay).toBe(false);
  });

  it('should render spinner with correct size class', () => {
    component.size = 'large';
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner__spinner--large');
    expect(spinner).toBeTruthy();
  });

  it('should display message when provided', () => {
    component.message = 'Carregando dados...';
    fixture.detectChanges();

    const messageElement = fixture.nativeElement.querySelector('.loading-spinner__message');
    expect(messageElement).toBeTruthy();
    expect(messageElement.textContent.trim()).toBe('Carregando dados...');
  });

  it('should not display message when not provided', () => {
    fixture.detectChanges();

    const messageElement = fixture.nativeElement.querySelector('.loading-spinner__message');
    expect(messageElement).toBeFalsy();
  });

  it('should add overlay class when overlay is true', () => {
    component.overlay = true;
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.loading-spinner--overlay');
    expect(container).toBeTruthy();
  });

  it('should have proper accessibility attributes', () => {
    component.message = 'Loading...';
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner__spinner');
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.getAttribute('aria-label')).toBe('Loading...');
  });

  it('should use default aria-label when no message provided', () => {
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner__spinner');
    expect(spinner.getAttribute('aria-label')).toBe('Carregando...');
  });
});