
export default class FindandReplace {
    constructor(hotHandler) {
        this.hotInstance = hotHandler;
        this.foundMatches = [];
        this.selectedIndex = -1;
        this.undoStack = [];
        this.redoStack = [];
        this.lastSearchQuery = null;
        this.contextSize = 2;     // Default context size
        this.searchDelay = null;  // For incremental search
        
        // Initialize keyboard shortcuts
        this._initializeKeyboardShortcuts();
    }

    _initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'f') {
                // TODO: Trigger the search modal or input field
            } else if (event.ctrlKey && event.key === 'r') {
                // TODO: Trigger the replace modal or input field
            } else if (event.ctrlKey && event.key === 'z') {
                this.undo();
            } else if (event.ctrlKey && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
                this.redo();
            }
        });
    }

    search(value, { isCaseInsensitive = false, range = null, columns = null, delay = 250 } = {}) {
        if (!value) return;
        this.hotInstance.manuelHooksflag(false);
        this.clearSearchDelay();
        this.searchDelay = setTimeout(() => {
            this.initializeSearch(value, isCaseInsensitive);
            this.performSearch(isCaseInsensitive, columns);
            this.highlightFirstMatch();
        }, delay);
        this.hotInstance.manuelHooksflag(true);
        return `${this.selectedIndex + 1} of ${this.foundMatches.length} matches`;
    }
    
    clearSearchDelay() {
        clearTimeout(this.searchDelay);
    }
    
    initializeSearch(value, isCaseInsensitive) {
        this.foundMatches = [];
        this.lastSearchQuery = value ? value.trim() : '';
        if (isCaseInsensitive) {
            this.lastSearchQuery = this.lastSearchQuery.toLowerCase();
        }
    
        // Pre-compute lowercase data for case-insensitive searches
        if (isCaseInsensitive) {
            this.hotInstance.hottable()
            this.lowercaseData = this.hotInstance.hottable().getData().map(row =>
                row.map(cell => (cell ? cell.toString().trim().toLowerCase() : ''))
            );
        }
    }
    
    
    performSearch(isCaseInsensitive, columns) {
        const data = isCaseInsensitive ? this.lowercaseData : this.hotInstance.hottable().getData();
        const searchQuery = this.lastSearchQuery;
    
        data.forEach((row, rowIndex) => {
            row.forEach((cellValue, colIndex) => {
                if (columns && !columns.includes(colIndex)) return; // Skip columns not in the list
    
                // Convert cellValue to a string, if it's not already
                cellValue = cellValue ? cellValue.toString().trim() : '';
    
                if (isCaseInsensitive) {
                    cellValue = cellValue.toLowerCase();
                }
    
                if (cellValue.includes(searchQuery)) {
                    this.foundMatches.push({ rowIndex, colIndex });
                }
            });
        });
    }    
    
    highlightFirstMatch() {
        if (this.foundMatches.length > 0) {
            this.highlight(0); // Highlight the first match
        }
    }
    
    
    highlight(index) {
        if (index < 0 || index >= this.foundMatches.length) return;
        this.selectedIndex = index;
        const { rowIndex, colIndex } = this.foundMatches[index];
        this.hotInstance.hottable().selectCell(rowIndex, colIndex);
        this.scrollToCell(rowIndex, colIndex);
        this.applyHighlighting(index);
    }
    
    scrollToCell(rowIndex, colIndex) {
        this.hotInstance.hottable().scrollViewportTo(rowIndex);
        const cellElement = this.hotInstance.hottable().getCell(rowIndex, colIndex);
        if (cellElement) {
            cellElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }
    
    applyHighlighting(index) {
        this.foundMatches.forEach((match, i) => {
            const { rowIndex, colIndex } = match;
            const cellElement = this.hotInstance.hottable().getCell(rowIndex, colIndex);
            if (cellElement) {
                cellElement.style.backgroundColor = i === index ? 'yellow' : 'lightyellow'; // Selected match or other matches
            }
        });
    }

    replaceAll(newValue, confirmationCallback) {
        // Validate inputs and confirm the replacement if needed
        if (typeof newValue !== 'string' || (typeof confirmationCallback === 'function' && !confirmationCallback(this.foundMatches.length))) {
            return;
        }
    
        // Save the current state for undo functionality
        this.saveCurrentState();
    
        // Check if there are specific cells selected
        const cellsToReplace = this.hotInstance.hottable().getSelected() || [];
        if (cellsToReplace.length > 0) {
            this.replaceInSelectedCells(cellsToReplace, newValue);
        } else {
            this.replaceInFoundMatches(newValue);
        }
    }
    saveCurrentState() {
        const originalData = this.hotInstance.hottable().getData().map(row => [...row]);
        this.undoStack.push(originalData);
        this.redoStack = [];  // Clear the redo stack on a new action
    }
    
    replaceInSelectedCells(cellsToReplace, newValue) {
        cellsToReplace.forEach(([startRow, startCol, endRow, endCol]) => {
            for (let row = startRow; row <= endRow; row++) {
                for (let col = startCol; col <= endCol; col++) {
                    this.hotInstance.hottable().setDataAtCell(row, col, newValue);
                }
            }
        });
    }
    
    replaceInFoundMatches(newValue) {
        this.foundMatches.forEach(match => {
            const { rowIndex, colIndex } = match;
            this.hotInstance.hottable().setDataAtCell(rowIndex, colIndex, newValue);
        });
    }
    
    replaceSelected(newValue) {
        if (this.selectedIndex < 0) return;
        const originalData = this.hotInstance.hottable().getData().map(row => [...row]);
        this.undoStack.push(originalData);
        this.redoStack = [];  // Clear the redo stack on a new action

        const { rowIndex, colIndex } = this.foundMatches[this.selectedIndex];
        this.hotInstance.hottable().setDataAtCell(rowIndex, colIndex, newValue);
    }

    undo() {
        const currentState = this.hotInstance.hottable().getData().map(row => [...row]);
        const lastState = this.undoStack.pop();
        if (lastState) {
            this.redoStack.push(currentState);
            this.hotInstance.loadData(lastState);
        }
    }

    redo() {
        const currentState = this.hotInstance.hottable().getData().map(row => [...row]);
        const nextState = this.redoStack.pop();
        if (nextState) {
            this.undoStack.push(currentState);
            this.hotInstance.loadData(nextState);
        }
    }

    getNext() {
        this.hotInstance.manuelHooksflag(false);
        if (this.selectedIndex + 1 < this.foundMatches.length) {
            this.highlight(this.selectedIndex + 1);
            const { rowIndex } = this.foundMatches[this.selectedIndex];
            this.hotInstance.hottable().scrollViewportTo(rowIndex);
            this.scrollToCell(rowIndex);
        }
        this.hotInstance.manuelHooksflag(true);
    }
    
    getPrevious() {
        this.hotInstance.manuelHooksflag(false);
        if (this.selectedIndex - 1 >= 0) {
            this.highlight(this.selectedIndex - 1);
            const { rowIndex } = this.foundMatches[this.selectedIndex];
            this.hotInstance.hottable().scrollViewportTo(rowIndex);
            this.scrollToCell(rowIndex);
        }
        this.hotInstance.manuelHooksflag(true);
    }
    
    scrollToCell(rowIndex) {
        const cellElement = this.hotInstance.hottable().getCell(rowIndex, 0); // Assuming column 0
        if (cellElement) {
            cellElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }
    getMatchContext(index, contextSize = this.contextSize) {
        if (index < 0 || index >= this.foundMatches.length) return null;
        const { rowIndex, colIndex } = this.foundMatches[index];
        const data = this.hotInstance.hottable().getData();
        const start = Math.max(colIndex - contextSize, 0);
        const end = Math.min(colIndex + contextSize + 1, data[rowIndex].length);
        return data[rowIndex].slice(start, end);
    }

    setContextSize(size) {
        this.contextSize = size;
    }

    getCursorPosition() {
        return this.selectedIndex; // If selectedIndex represents the current cursor position
    }
    setCursorPosition(position) {
        this.selectedIndex = position; // Assuming selectedIndex represents the current cursor position
    }
    batchUndo(count) {
        for (let i = 0; i < count; i++) {
            this.undo();
        }
    }

    batchRedo(count) {
        for (let i = 0; i < count; i++) {
            this.redo();
        }
    }
}