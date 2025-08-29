import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  readonly tabs = ['Account', 'Security', 'Privacy', 'Appearance', 'Sessions'] as const;
  activeTab = signal<(typeof this.tabs)[number]>('Account');

  // Account
  displayName = signal<string>('Alex Traveler');
  email = signal<string>('alex@example.com');



  // Privacy
  isPrivate = signal<boolean>(false);
  showOnline = signal<boolean>(true);
  allowRequests = signal<boolean>(true);

  // Security
  twoFactor = signal<boolean>(false);
  loginAlerts = signal<boolean>(true);
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  passwordSaving = signal<boolean>(false);
  passwordMessage = signal<string>('');

  // Appearance
  theme = signal<'system' | 'light' | 'dark'>('system');
  compactMode = signal<boolean>(false);

  setTab(tab: (typeof this.tabs)[number]) {
    this.activeTab.set(tab);
  }

  saveAll() {
    // In real app, call API to persist
    console.log('Settings saved');
  }

  async changePassword() {
    this.passwordMessage.set('');
    const curr = this.currentPassword().trim();
    const next = this.newPassword().trim();
    const conf = this.confirmPassword().trim();
    if (!curr || !next) {
      this.passwordMessage.set('Please fill all password fields.');
      return;
    }
    if (next.length < 8) {
      this.passwordMessage.set('New password must be at least 8 characters.');
      return;
    }
    if (next !== conf) {
      this.passwordMessage.set('Passwords do not match.');
      return;
    }
    this.passwordSaving.set(true);
    await new Promise(res => setTimeout(res, 800));
    this.passwordSaving.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordMessage.set('Password updated successfully.');
  }
}


