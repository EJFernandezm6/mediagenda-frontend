import { Component, input, output, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-x-auto custom-scrollbar">
      <table class="table-v2">
        <thead class="bg-gray-50/50">
          <tr class="table-v2-header">
            @for (column of columns(); track column.key) {
              <th [class]="column.headerClass || ''" [style.text-align]="column.align || 'left'">
                {{ column.label }}
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-border-soft">
          @for (item of data(); track (item.id || item.patientId || item.specialtyId || $index)) {
            <tr class="table-v2-row group">
              @for (column of columns(); track column.key) {
                <td [style.text-align]="column.align || 'left'">
                  <ng-container *ngTemplateOutlet="column.template || defaultCellRef; context: { $implicit: item, column: column }"></ng-container>
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="columns().length" class="px-6 py-12 text-center text-text-light italic">
                No se encontraron registros.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Default Cell Template -->
    <ng-template #defaultCellRef let-item let-column="column">
      <div [class]="column.cellClass || ''">
        {{ item[column.key] }}
      </div>
    </ng-template>
  `
})
export class DataTableComponent {
  data = input.required<any[]>();
  columns = input.required<DataTableColumn[]>();
}

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  headerClass?: string;
  cellClass?: string;
  template?: TemplateRef<any>;
}
