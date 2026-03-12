import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex items-center justify-between w-full" *ngIf="totalPages > 1">
      <!-- Mobile View -->
      <div class="flex flex-1 justify-between sm:hidden w-full px-4 py-3">
        <button (click)="changePage(currentPage - 1)" [disabled]="currentPage === 1"
          class="relative inline-flex items-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-text-muted hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Anterior
        </button>
        <button (click)="changePage(currentPage + 1)" [disabled]="currentPage === totalPages"
          class="relative ml-3 inline-flex items-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-text-muted hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Siguiente
        </button>
      </div>

      <!-- Desktop View -->
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between px-6 py-4">
        <div>
          <p class="text-[13px] text-text-muted">
            Mostrando
            <span class="font-medium text-text-main">{{ startIndex + 1 }}</span>
            a
            <span class="font-medium text-text-main">{{ endIndex }}</span>
            de
            <span class="font-medium text-text-main">{{ totalItems }}</span>
            {{ itemLabel }}
          </p>
        </div>
        <div>
          <nav class="isolate inline-flex -space-x-px gap-1 rounded-md" aria-label="Pagination">
            <button (click)="changePage(currentPage - 1)" [disabled]="currentPage === 1"
              class="relative inline-flex items-center rounded-lg p-2 text-text-light hover:text-accent hover:bg-accent-soft focus:z-20 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-light transition-colors">
              <span class="sr-only">Anterior</span>
              <lucide-icon [img]="Icons.ChevronLeft" class="h-4.5 w-4.5" [strokeWidth]="1.5"></lucide-icon>
            </button>
            
            <ng-container *ngFor="let page of pages">
                <button *ngIf="page !== -1" (click)="changePage(page)" 
                    [class.bg-muted]="page === currentPage"
                    [class.text-text-main]="page === currentPage"
                    [class.font-bold]="page === currentPage"
                    [class.text-text-muted]="page !== currentPage"
                    [class.hover:bg-muted]="page !== currentPage"
                    [class.hover:text-text-main]="page !== currentPage"
                    class="relative inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg text-[13px] font-medium transition-colors outline-none focus:z-20">
                    {{ page }}
                </button>
                <span *ngIf="page === -1" class="relative inline-flex items-center justify-center min-w-[32px] h-8 text-[13px] font-medium text-text-light">...</span>
            </ng-container>

            <button (click)="changePage(currentPage + 1)" [disabled]="currentPage === totalPages"
              class="relative inline-flex items-center rounded-lg p-2 text-text-light hover:text-accent hover:bg-accent-soft focus:z-20 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-light transition-colors">
              <span class="sr-only">Siguiente</span>
              <lucide-icon [img]="Icons.ChevronRight" class="h-4.5 w-4.5" [strokeWidth]="1.5"></lucide-icon>
            </button>
          </nav>
        </div>
      </div>
    </div>
  `
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage: number = 1;
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 10;
  @Input() itemLabel: string = 'resultados';
  @Output() pageChange = new EventEmitter<number>();

  totalPages: number = 0;
  pages: number[] = [];
  startIndex: number = 0;
  endIndex: number = 0;

  readonly Icons = { ChevronLeft, ChevronRight };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems'] || changes['pageSize'] || changes['currentPage']) {
      this.calculatePagination();
    }
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);

    // Ensure current page is valid
    if (this.currentPage < 1) this.currentPage = 1;
    if (this.currentPage > this.totalPages && this.totalPages > 0) this.currentPage = this.totalPages;

    this.startIndex = (this.currentPage - 1) * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.totalItems);

    this.pages = this.getVisiblePages();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  getVisiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2; // Number of pages to show around current
    const range: number[] = [];
    const rangeWithDots: number[] = [];
    let l: number | undefined;

    range.push(1);

    if (total <= 1) return [1];

    for (let i = current - delta; i <= current + delta; i++) {
      if (i < total && i > 1) {
        range.push(i);
      }
    }

    range.push(total);

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push(-1); // -1 represents '...'
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }
}
