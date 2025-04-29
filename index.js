// DOM Elements
const notesGrid = document.getElementById('notesGrid');
const addButton = document.getElementById('addButton');
const modal = document.getElementById('noteModal');
const viewOnlyModal = document.getElementById('viewOnlyModal');
const viewOnlyTitle = document.getElementById('viewOnlyTitle');
const viewOnlyBody = document.getElementById('viewOnlyBody');
const closeViewOnly = document.getElementById('closeViewOnly');
const titleInput = document.getElementById('noteTitle');
const contentEditor = document.getElementById('noteContent');
const lineNumbers = document.getElementById('lineNumbers');
const fontStyle = document.getElementById('fontStyle');
const fontSize = document.getElementById('fontSize');
const sheetStyle = document.getElementById('sheetStyle');
const saveNote = document.getElementById('saveNote');
const cancelNote = document.getElementById('cancelNote');
const deleteNote = document.getElementById('deleteNote');
const selectAll = document.getElementById('selectAll');
const deleteSelected = document.getElementById('deleteSelected');
const toggleBold = document.getElementById('toggleBold');
const toggleItalic = document.getElementById('toggleItalic');
const toggleUnderline = document.getElementById('toggleUnderline');

// Constants for protected notes
const WELCOME_NOTE_ID = 'welcome-note';

// State
let notes = JSON.parse(localStorage.getItem('notes') || '[]');
let selectedNotes = new Set();
let currentNoteId = null;
let showLineNumbers = true;

// Check if this is the first time loading the app
const isFirstLoad = localStorage.getItem('notesAppFirstLoad') !== 'false';
if (isFirstLoad || !notes.some(note => note.id === WELCOME_NOTE_ID)) {
    // Add welcome note if it doesn't exist
    if (!notes.some(note => note.id === WELCOME_NOTE_ID)) {
        const welcomeNote = {
            id: WELCOME_NOTE_ID,
            title: 'Welcome to Notes',
            content: `
                <div style="text-align: center; margin-bottom: 20px;">
                    <p>Notes are a great way to capture inspiration and organize your thoughts....</p>
                </div>
                <div style="margin-top: 20px;">
                    <h3>Terms and Conditions</h3>
                    <p>By using this Notes application, you agree to the following terms:</p>
                    <ul>
                        <li>Your notes are stored locally in your browser</li>
                        <li>We do not collect any personal data</li>
                        <li>You are responsible for backing up your own notes</li>
                        <li>This application is provided "as is" without warranty of any kind</li>
                    </ul>
                    <p style="margin-top: 15px;">This is a simple notepad application that allows you to:</p>
                    <ul>
                        <li>Create and edit notes</li>
                        <li>Format text (bold, italic, underline)</li>
                        <li>Choose different fonts and sizes</li>
                        <li>Select different paper styles</li>
                        <li>Delete notes when no longer needed</li>
                    </ul>
                </div>
            `,
            date: 'January 31, 2025',
            fontStyle: 'Arial, sans-serif',
            fontSize: '16px',
            sheetStyle: 'plain',
            protected: true,
            viewOnly: true
        };
        notes.unshift(welcomeNote);
    }
    
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('notesAppFirstLoad', 'false');
}

// Event Listeners
addButton.addEventListener('click', () => {
    currentNoteId = null;
    openModal();
});

contentEditor.addEventListener('input', updateLineNumbers);

toggleBold.addEventListener('click', () => {
    document.execCommand('bold', false, null);
    contentEditor.focus();
});

toggleItalic.addEventListener('click', () => {
    document.execCommand('italic', false, null);
    contentEditor.focus();
});

toggleUnderline.addEventListener('click', () => {
    document.execCommand('underline', false, null);
    contentEditor.focus();
});

sheetStyle.addEventListener('change', () => {
    contentEditor.className = `editor sheet-${sheetStyle.value}`;
});

fontStyle.addEventListener('change', () => {
    contentEditor.style.fontFamily = fontStyle.value;
});

fontSize.addEventListener('change', () => {
    contentEditor.style.fontSize = fontSize.value;
});

closeViewOnly.addEventListener('click', () => {
    viewOnlyModal.style.display = 'none';
});

saveNote.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const content = contentEditor.innerHTML;
    
    if (!title || !content) {
        alert('Please fill in both title and content');
        return;
    }

    const isProtected = currentNoteId === WELCOME_NOTE_ID;
    const isViewOnly = isProtected; // View-only for protected notes

    const note = {
        id: currentNoteId || Date.now(),
        title,
        content,
        date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        fontStyle: fontStyle.value,
        fontSize: fontSize.value,
        sheetStyle: sheetStyle.value,
        protected: isProtected,
        viewOnly: isViewOnly
    };

    if (currentNoteId) {
        const index = notes.findIndex(n => n.id === currentNoteId);
        if (index !== -1) notes[index] = note;
    } else {
        notes.unshift(note);
    }

    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
    closeModal();
    vibrateOnAction();
});

cancelNote.addEventListener('click', closeModal);

deleteNote.addEventListener('click', () => {
    // Check if current note is protected
    const currentNote = notes.find(note => note.id === currentNoteId);
    if (currentNote && currentNote.protected) {
        alert('This note cannot be deleted.');
        return;
    }

    if (currentNoteId && confirm('Are you sure you want to delete this note?')) {
        notes = notes.filter(note => note.id !== currentNoteId);
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
        closeModal();
        vibrateOnAction();
    }
});

selectAll.addEventListener('change', () => {
    if (selectAll.checked) {
        // Only select non-protected notes
        notes.forEach(note => {
            if (!note.protected) {
                selectedNotes.add(note.id);
            }
        });
    } else {
        selectedNotes.clear();
    }
    renderNotes();
});

deleteSelected.addEventListener('click', () => {
    if (selectedNotes.size && confirm('Are you sure you want to delete selected notes?')) {
        notes = notes.filter(note => !selectedNotes.has(note.id) || note.protected);
        localStorage.setItem('notes', JSON.stringify(notes));
        selectedNotes.clear();
        renderNotes();
        vibrateOnAction();
    }
});

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === modal) {
        closeModal();
    }
    if (event.target === viewOnlyModal) {
        viewOnlyModal.style.display = 'none';
    }
};

// Functions
function openModal() {
    modal.style.display = 'flex';
    titleInput.value = '';
    contentEditor.innerHTML = '';
    fontStyle.value = 'Arial, sans-serif';
    fontSize.value = '16px';
    sheetStyle.value = 'plain';
    contentEditor.style.fontFamily = fontStyle.value;
    contentEditor.style.fontSize = fontSize.value;
    contentEditor.className = 'editor sheet-plain';
    updateLineNumbers();
    
    // Hide delete button for protected notes
    const isProtected = currentNoteId === WELCOME_NOTE_ID;
    deleteNote.style.display = isProtected ? 'none' : 'block';
}

function openViewOnlyModal(note) {
    viewOnlyTitle.textContent = note.title;
    viewOnlyBody.innerHTML = note.content;
    viewOnlyBody.style.fontFamily = note.fontStyle;
    viewOnlyBody.style.fontSize = note.fontSize;
    viewOnlyModal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

function updateLineNumbers() {
    const lines = contentEditor.innerText.split('\n');
    lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('\n');
}

function renderNotes(notesToRender = notes) {
    notesGrid.innerHTML = '';
    notesToRender.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = `note ${selectedNotes.has(note.id) ? 'selected' : ''}`;
        noteElement.dataset.id = note.id;
        
        const charCount = note.content.replace(/<[^>]*>/g, '').length;
        const isProtected = note.protected;
        const isViewOnly = note.viewOnly;
        
        noteElement.innerHTML = `
            ${isProtected ? '<div class="protected-note">Protected</div>' : ''}
            <input type="checkbox" class="note-checkbox" data-id="${note.id}" 
                ${selectedNotes.has(note.id) ? 'checked' : ''}
                ${isProtected ? 'disabled' : ''}>
            <h2 style="font-family: ${note.fontStyle}; font-size: ${note.fontSize}">${note.title}</h2>
            <div class="note-content" style="font-family: ${note.fontStyle}; font-size: ${note.fontSize}">
                ${note.content}
            </div>
            <div class="note-info">
                <span>${note.date}</span>
                <span>${charCount} characters</span>
            </div>
        `;

        noteElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('note-checkbox')) {
                if (isViewOnly) {
                    openViewOnlyModal(note);
                } else {
                    editNote(note);
                }
            }
        });
        
        const checkbox = noteElement.querySelector('.note-checkbox');
        if (checkbox && !isProtected) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                toggleNoteSelection(e, note.id);
            });
        }

        notesGrid.appendChild(noteElement);
    });

    updateDeleteSelectedButton();
}

function editNote(note) {
    currentNoteId = note.id;
    
    // If the note is view-only, open in view-only mode
    if (note.viewOnly) {
        openViewOnlyModal(note);
        return;
    }
    
    modal.style.display = 'flex';
    titleInput.value = note.title;
    contentEditor.innerHTML = note.content;
    fontStyle.value = note.fontStyle;
    fontSize.value = note.fontSize;
    sheetStyle.value = note.sheetStyle;
    contentEditor.className = `editor sheet-${note.sheetStyle}`;
    contentEditor.style.fontFamily = note.fontStyle;
    contentEditor.style.fontSize = note.fontSize;
    updateLineNumbers();
    
    // Hide delete button for protected notes
    deleteNote.style.display = note.protected ? 'none' : 'block';
}

function toggleNoteSelection(e, noteId) {
    // Don't allow selection of protected notes
    const note = notes.find(n => n.id === noteId);
    if (note && note.protected) {
        return;
    }
    
    if (e.target.checked) {
        selectedNotes.add(noteId);
    } else {
        selectedNotes.delete(noteId);
        selectAll.checked = false;
    }
    renderNotes();
}

function updateDeleteSelectedButton() {
    deleteSelected.style.display = selectedNotes.size > 0 ? 'block' : 'none';
    
    // Count only non-protected notes for "select all" checkbox state
    const selectableNotes = notes.filter(note => !note.protected);
    selectAll.checked = selectedNotes.size === selectableNotes.length && selectableNotes.length > 0;
}

function addSwipeToDelete() {
    let touchStartX = 0;
    let touchEndX = 0;
    let currentElement = null;
    
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        currentElement = e.target.closest('.note');
    }, false);

    document.addEventListener('touchend', e => {
        if (!currentElement) return;
        
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 100) {
            const noteId = currentElement.dataset.id;
            if (noteId) {
                // Check if note is protected
                const note = notes.find(n => n.id === noteId);
                if (note && note.protected) {
                    alert('This note cannot be deleted.');
                    return;
                }
                deleteNoteById(noteId);
            }
        }
    }, false);

    function deleteNoteById(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(note => note.id !== noteId);
            localStorage.setItem('notes', JSON.stringify(notes));
            renderNotes();
            vibrateOnAction();
        }
    }
}

// Add vibration feedback
function vibrateOnAction() {
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

// Initialize
renderNotes();
addSwipeToDelete();