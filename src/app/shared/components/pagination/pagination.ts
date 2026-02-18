import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';

@Component({
    selector: 'app-pagination',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4" *ngIf="totalPages > 1">
      <!-- Mobile View -->
      <div class="flex flex-1 justify-between sm:hidden">
        <button (click)="changePage(currentPage - 1)" [disabled]="currentPage === 1"
          class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Anterior
        </button>
        <button (click)="changePage(currentPage + 1)" [disabled]="currentPage === totalPages"
          class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Siguiente
        </button>
      </div>

      <!-- Desktop View -->
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Mostrando
            <span class="font-medium">{{ startIndex + 1 }}</span>
            a
            <span class="font-medium">{{ endIndex }}</span>
            de
            <span class="font-medium">{{ totalItems }}</span>
            resultados
          </p>
        </div>
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button (click)="changePage(currentPage - 1)" [disabled]="currentPage === 1"
              class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">Anterior</span>
              <lucide-icon [img]="Icons.ChevronLeft" class="h-5 w-5"></lucide-icon>
            </button>
            
            <ng-container *ngFor="let page of pages">
                <button *ngIf="page !== -1" (click)="changePage(page)" 
                    [class.bg-blue-600]="page === currentPage"
                    [class.text-white]="page === currentPage"
                    [class.text-gray-900]="page !== currentPage"
                    [class.ring-gray-300]="page !== currentPage"
                    [class.hover:bg-gray-50]="page !== currentPage"
                    class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset focus:z-20 focus:outline-offset-0">
                    {{ page }}
                </button>
                <span *ngIf="page === -1" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>
            </ng-container>

            <button (click)="changePage(currentPage + 1)" [disabled]="currentPage === totalPages"
              class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">Siguiente</span>
              <lucide-icon [img]="Icons.ChevronRight" class="h-5 w-5"></lucide-icon>
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
