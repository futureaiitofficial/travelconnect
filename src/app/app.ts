import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Main application component for Travel Connect
 * This is the root component that houses the entire application layout
 * including header, navigation, main content area, and footer
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Main app component - serves as the layout wrapper for all pages
}
