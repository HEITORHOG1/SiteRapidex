import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/ui/toast-container/toast-container';
import { NetworkStatusComponent } from './shared/ui/network-status/network-status.component';

@Component({
  selector: 'rx-root',
  imports: [RouterOutlet, ToastContainerComponent, NetworkStatusComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('app-rapidex');
}
