import { Component, computed, signal, input, output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, ChevronLeft, ChevronRight } from 'lucide-angular';

export interface CalendarDay {
    date: Date;
    dayOfMonth: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isEnabled: boolean;
    isoDate: string; // YYYY-MM-DD
}

@Component({
    selector: 'app-datepicker',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './datepicker.html',
    styles: [`
    .dropdown-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        background: transparent;
    }
  `]
})
export class DatePickerComponent implements OnInit {
    private static activePicker: DatePickerComponent | null = null;
    icons = { Calendar, ChevronLeft, ChevronRight };

    // Inputs
    @Input() placeholder: string = 'Seleccionar fecha...';
    @Input() allowPastDates: boolean = false;
    @Input() borderless: boolean = false;
    @Input() position: 'left' | 'right' = 'left';
    disabledState = signal(false);
    @Input('disabled')
    set disabled(value: boolean) {
        this.disabledState.set(value);
    }

    // enabledDates can be null/undefined (all dates enabled) or array of strict YYYY-MM-DD strings
    private _enabledDates: string[] | null = null;
    @Input()
    set enabledDates(dates: string[] | null) {
        this._enabledDates = dates;
        this.recalculateCalendar();
    }

    // Value binding
    currentValue = signal<string>('');
    @Input()
    set value(v: string) {
        this.currentValue.set(v || '');
        if (v) {
            const [y, m, d] = v.split('-');
            this.currentMonth.set(new Date(+y, +m - 1, 1)); // Sync calendar view to selected date
        }
        this.recalculateCalendar();
    }

    // Outputs
    valueChange = output<string>();

    // Internal UI State
    isOpen = signal(false);

    // Calendar State
    currentMonth = signal<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    calendarGrid = signal<CalendarDay[][]>([]);

    weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

    monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    get currentMonthName() {
        return this.monthNames[this.currentMonth().getMonth()];
    }

    get currentYear() {
        return this.currentMonth().getFullYear();
    }

    ngOnInit() {
        this.recalculateCalendar();
    }

    private recalculateCalendar() {
        // Debounce slightly or just recalculate
        const year = this.currentMonth().getFullYear();
        const month = this.currentMonth().getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // JS getDay() 0=Sun, 1=Mon... we want Mon=0, Sun=6
        let firstDayIndex = firstDayOfMonth.getDay() - 1;
        if (firstDayIndex === -1) firstDayIndex = 6; // Sunday becomes 6

        const today = new Date();
        const todayIso = this.toIso(today);
        const selectedIso = this.currentValue();

        let currentDay = new Date(year, month, 1 - firstDayIndex); // Start from previous month overflow

        const grid: CalendarDay[][] = [];

        for (let row = 0; row < 6; row++) {
            const week: CalendarDay[] = [];
            for (let col = 0; col < 7; col++) {
                const dayDate = new Date(currentDay);
                const isoDate = this.toIso(dayDate);
                const isCurrentMonth = dayDate.getMonth() === month;

                // If enabledDates is provided, check if isoDate is in it.
                // If not provided, assume we want dates >= today by default.
                let isEnabled = false;
                if (this._enabledDates != null) {
                    isEnabled = isCurrentMonth && this._enabledDates.includes(isoDate);
                } else {
                    isEnabled = isCurrentMonth && (this.allowPastDates || isoDate >= todayIso);
                }

                week.push({
                    date: dayDate,
                    dayOfMonth: dayDate.getDate(),
                    isCurrentMonth: isCurrentMonth,
                    isToday: isoDate === todayIso,
                    isSelected: isoDate === selectedIso,
                    isEnabled: isEnabled,
                    isoDate: isoDate
                });
                currentDay.setDate(currentDay.getDate() + 1);
            }
            grid.push(week);
            // Break early if we finished the month on row 4 or 5
            if (currentDay.getMonth() > month && row >= 4) {
                break;
            }
        }

        this.calendarGrid.set(grid);
    }

    private toIso(date: Date): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    openDropdown() {
        if (this.disabledState()) return;

        if (DatePickerComponent.activePicker && DatePickerComponent.activePicker !== this) {
            DatePickerComponent.activePicker.isOpen.set(false);
        }
        DatePickerComponent.activePicker = this;
        this.isOpen.set(true);
        // If there is no value, reset currentMonth to today
        if (!this.currentValue()) {
            this.currentMonth.set(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            this.recalculateCalendar();
        }
    }

    closeDropdown(event?: Event) {
        if (event) event.stopPropagation();
        this.isOpen.set(false);
    }

    selectDate(day: CalendarDay) {
        if (!day.isEnabled) return;

        this.currentValue.set(day.isoDate);
        this.isOpen.set(false);
        this.valueChange.emit(day.isoDate);
        this.recalculateCalendar();
    }

    nextMonth(event: Event) {
        event.stopPropagation();
        const next = new Date(this.currentMonth());
        next.setMonth(next.getMonth() + 1);
        this.currentMonth.set(next);
        this.recalculateCalendar();
    }

    prevMonth(event: Event) {
        event.stopPropagation();
        const prev = new Date(this.currentMonth());
        prev.setMonth(prev.getMonth() - 1);
        this.currentMonth.set(prev);
        this.recalculateCalendar();
    }
}
