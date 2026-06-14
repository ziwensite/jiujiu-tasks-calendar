import { CalendarView } from '../CalendarView';

export function adjustTaskListHeight(view: CalendarView) {
    const container = view.containerEl.children[1] as HTMLElement;
    if (!container) return;

    const viewHeight = container.offsetHeight;

    let totalHeightAboveTaskList = 0;

    const calendarHeader = container.querySelector('.calendar-header') as HTMLElement;
    if (calendarHeader) {
        totalHeightAboveTaskList += calendarHeader.offsetHeight;
    }

    const calendarTable = container.querySelector('.calendar-table') as HTMLElement;
    if (calendarTable) {
        totalHeightAboveTaskList += calendarTable.offsetHeight;
    }

    const yearViewContainer = container.querySelector('.year-view-container') as HTMLElement;
    if (yearViewContainer) {
        totalHeightAboveTaskList += yearViewContainer.offsetHeight;
    }

    const taskListContainer = container.querySelector('.task-list-container') as HTMLElement;
    if (taskListContainer) {
        const taskListContainerStyle = window.getComputedStyle(taskListContainer);
        totalHeightAboveTaskList += parseFloat(taskListContainerStyle.marginTop) || 0;
        totalHeightAboveTaskList += parseFloat(taskListContainerStyle.marginBottom) || 0;
        totalHeightAboveTaskList += parseFloat(taskListContainerStyle.paddingTop) || 0;
        totalHeightAboveTaskList += parseFloat(taskListContainerStyle.paddingBottom) || 0;

        const taskListHeader = taskListContainer.querySelector('.task-list-header') as HTMLElement;
        if (taskListHeader) {
            totalHeightAboveTaskList += taskListHeader.offsetHeight;
        }
    }

    const remainingHeight = Math.max(0, viewHeight - totalHeightAboveTaskList - 60);

    if (taskListContainer) {
        const taskList = taskListContainer.querySelector('.task-list') as HTMLElement;
        if (taskList) {
            taskList.style.height = `${remainingHeight}px`;
        }
    }
}

export function toggleCalendarView(view: CalendarView) {
    if (view.viewType === 'month') {
        const calendarTable = view.containerEl.querySelector('.calendar-table') as HTMLElement;
        if (calendarTable) {
            const tbody = calendarTable.querySelector('tbody');
            const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

            if (rows.length > 0) {
                const isCollapsed = rows.some(row => row.style.display === 'none');

                if (isCollapsed) {
                    rows.forEach(row => {
                        row.style.display = '';
                    });
                } else {
                    let selectedRowIndex = -1;
                    if (view.selectedDate) {
                        const firstDayOfMonth = new Date(view.currentDate.getFullYear(), view.currentDate.getMonth(), 1);
                        const startDayOfWeek = firstDayOfMonth.getDay();
                        const prevMonthDaysToShow = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

                        const selectedDay = view.selectedDate.getDate();
                        selectedRowIndex = Math.floor((prevMonthDaysToShow + selectedDay - 1) / 7);
                    }

                    rows.forEach(row => {
                        row.style.display = 'none';
                    });

                    const selectedRow = rows[selectedRowIndex];
                    if (selectedRowIndex >= 0 && selectedRowIndex < rows.length && selectedRow) {
                        selectedRow.style.display = '';
                    } else if (rows.length > 0 && rows[0]) {
                        rows[0].style.display = '';
                    }
                }
            }
        }
    } else if (view.viewType === 'year') {
        const yearViewContainer = view.containerEl.querySelector('.year-view-container') as HTMLElement;
        if (yearViewContainer) {
            if (yearViewContainer.style.maxHeight) {
                yearViewContainer.style.maxHeight = "30em";
                yearViewContainer.style.overflow = "hidden";

                setTimeout(() => {
                    yearViewContainer.style.maxHeight = "";
                    yearViewContainer.style.overflow = "";
                }, 300);
            } else {
                yearViewContainer.style.maxHeight = "8em";
                yearViewContainer.style.overflow = "hidden";
            }
        }
    }

    setTimeout(() => {
        adjustTaskListHeight(view);
    }, 100);
}