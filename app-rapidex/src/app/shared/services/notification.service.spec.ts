import { TestBed } from '@angular/core/testing';
import { NotificationService, Notification } from './notification.service';
import { fakeAsync, tick } from '@angular/core/testing';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty notifications', (done) => {
    service.getNotifications().subscribe(notifications => {
      expect(notifications).toEqual([]);
      done();
    });
  });

  it('should add success notification', (done) => {
    const message = 'Success message';
    service.success(message);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].dismissible).toBe(true);
      expect(notifications[0].duration).toBe(5000);
      done();
    });
  });

  it('should add error notification with no auto-dismiss', (done) => {
    const message = 'Error message';
    service.error(message);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].duration).toBe(0);
      done();
    });
  });

  it('should add warning notification', (done) => {
    const message = 'Warning message';
    service.warning(message);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].message).toBe(message);
      done();
    });
  });

  it('should add info notification', (done) => {
    const message = 'Info message';
    service.info(message);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('info');
      expect(notifications[0].message).toBe(message);
      done();
    });
  });

  it('should dismiss notification by id', (done) => {
    const id = service.success('Test message');
    
    // First check that notification was added
    service.getNotifications().subscribe(notifications => {
      if (notifications.length === 1) {
        // Now dismiss it
        service.dismiss(id);
      } else if (notifications.length === 0) {
        // Notification was dismissed
        done();
      }
    });
  });

  it('should dismiss all notifications', (done) => {
    service.success('Message 1');
    service.error('Message 2');
    service.warning('Message 3');

    service.getNotifications().subscribe(notifications => {
      if (notifications.length === 3) {
        service.dismissAll();
      } else if (notifications.length === 0) {
        done();
      }
    });
  });

  it('should auto-dismiss notifications after duration', fakeAsync(() => {
    let notifications: Notification[] = [];
    
    service.getNotifications().subscribe(n => notifications = n);
    
    service.success('Test message', { duration: 1000 });
    
    expect(notifications.length).toBe(1);
    
    tick(1000);
    
    expect(notifications.length).toBe(0);
  }));

  it('should not auto-dismiss when duration is 0', fakeAsync(() => {
    let notifications: Notification[] = [];
    
    service.getNotifications().subscribe(n => notifications = n);
    
    service.error('Test error'); // Errors have duration: 0 by default
    
    expect(notifications.length).toBe(1);
    
    tick(10000); // Wait a long time
    
    expect(notifications.length).toBe(1); // Should still be there
  }));

  it('should add notification with custom options', (done) => {
    const options = {
      duration: 3000,
      dismissible: false,
      action: {
        label: 'Retry',
        handler: () => {}
      }
    };

    service.success('Test message', options);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].duration).toBe(3000);
      expect(notifications[0].dismissible).toBe(false);
      expect(notifications[0].action).toBeDefined();
      expect(notifications[0].action?.label).toBe('Retry');
      done();
    });
  });

  it('should show API error with default message', (done) => {
    service.showApiError(null);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Ocorreu um erro inesperado');
      expect(notifications[0].action).toBeDefined();
      done();
    });
  });

  it('should show API error with custom message', (done) => {
    const error = { message: 'Custom error message' };
    service.showApiError(error);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe('Custom error message');
      done();
    });
  });

  it('should show network error', (done) => {
    service.showNetworkError();

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Erro de conexão. Verifique sua internet e tente novamente.');
      expect(notifications[0].action).toBeDefined();
      done();
    });
  });

  it('should show validation error', (done) => {
    const message = 'Validation failed';
    service.showValidationError(message);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].duration).toBe(4000);
      done();
    });
  });

  it('should show success message', (done) => {
    const message = 'Operation successful';
    service.showSuccessMessage(message);

    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].duration).toBe(3000);
      done();
    });
  });

  it('should generate unique IDs for notifications', () => {
    const id1 = service.success('Message 1');
    const id2 = service.success('Message 2');
    
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^notification-\d+$/);
    expect(id2).toMatch(/^notification-\d+$/);
  });
});