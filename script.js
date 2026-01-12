// ============================================
// Storage
// ============================================
const STORAGE_KEY = 'code-snippets';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function loadSnippets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSnippets(snippets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

// ============================================
// Language Detection
// ============================================
const languagePatterns = [
  {
    language: 'html',
    patterns: [
      /<!DOCTYPE\s+html/i,
      /<html[\s>]/i,
      /<head[\s>]/i,
      /<body[\s>]/i,
      /<div[\s>]/i,
      /<span[\s>]/i,
      /<p[\s>]/i,
      /<a\s+href/i,
      /<img\s+src/i,
      /<script[\s>]/i,
      /<style[\s>]/i,
      /<\/\w+>/
    ],
    keywords: [],
    weight: 10
  },
  {
    language: 'css',
    patterns: [
      /\{[\s\S]*?:[\s\S]*?;[\s\S]*?\}/,
      /@media\s*\(/,
      /@keyframes\s+\w+/,
      /@import\s+/,
      /\.\w+\s*\{/,
      /#\w+\s*\{/,
      /:\s*hover\s*\{/,
      /:\s*focus\s*\{/,
      /background(-color)?:/,
      /font(-size|-family|-weight)?:/,
      /margin(-top|-right|-bottom|-left)?:/,
      /padding(-top|-right|-bottom|-left)?:/,
      /display\s*:/,
      /flex(-direction|-wrap)?:/,
      /grid(-template)?:/
    ],
    keywords: [],
    weight: 8
  },
  {
    language: 'typescript',
    patterns: [
      /:\s*(string|number|boolean|any|void|never|unknown)\b/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /<\w+(\s*,\s*\w+)*>/,
      /as\s+(string|number|boolean|any)/,
      /\w+\s*:\s*\w+\[\]/,
      /:\s*React\.\w+/,
      /import\s+type\s+/
    ],
    keywords: ['interface', 'type', 'namespace', 'enum', 'readonly', 'private', 'public', 'protected'],
    weight: 12
  },
  {
    language: 'javascript',
    patterns: [
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /\bfunction\s+\w+\s*\(/,
      /=>\s*\{/,
      /=>\s*[^{]/,
      /\bconsole\.(log|warn|error)\(/,
      /\bdocument\.\w+/,
      /\bwindow\.\w+/,
      /\bawait\s+/,
      /\basync\s+function/,
      /\.then\s*\(/,
      /\.catch\s*\(/,
      /import\s+.*\s+from\s+['"]/,
      /export\s+(default\s+)?/,
      /require\s*\(['"]/,
      /module\.exports/
    ],
    keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'new', 'class', 'extends', 'import', 'export', 'default', 'async', 'await'],
    weight: 6
  },
  {
    language: 'python',
    patterns: [
      /\bdef\s+\w+\s*\(/,
      /\bclass\s+\w+\s*(\(|:)/,
      /\bimport\s+\w+/,
      /\bfrom\s+\w+\s+import/,
      /\bif\s+.*:/,
      /\bfor\s+\w+\s+in\s+/,
      /\bwhile\s+.*:/,
      /\bprint\s*\(/,
      /\bself\./,
      /\b__\w+__\b/,
      /\bTrue\b|\bFalse\b|\bNone\b/,
      /\belif\s+.*:/,
      /\bexcept\s*(\w+)?:/,
      /\bwith\s+.*\s+as\s+/,
      /\blambda\s+/,
      /#.*$/m
    ],
    keywords: ['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'return', 'yield', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None'],
    weight: 8
  },
  {
    language: 'json',
    patterns: [
      /^\s*\{[\s\S]*\}\s*$/,
      /^\s*\[[\s\S]*\]\s*$/,
      /"\w+"\s*:\s*(".*"|[\d.]+|true|false|null|\[|\{)/
    ],
    keywords: [],
    weight: 5
  }
];

function countPatternMatches(code, patterns) {
  return patterns.reduce((count, pattern) => {
    const matches = code.match(new RegExp(pattern, 'gm'));
    return count + (matches ? matches.length : 0);
  }, 0);
}

function countKeywordMatches(code, keywords) {
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = code.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function detectLanguage(code) {
  if (!code.trim()) return 'unknown';

  // Try JSON first with strict validation
  try {
    JSON.parse(code.trim());
    return 'json';
  } catch {
    // Not valid JSON
  }

  const scores = {
    javascript: 0,
    typescript: 0,
    python: 0,
    html: 0,
    css: 0,
    json: 0,
    unknown: 0
  };

  for (const langPattern of languagePatterns) {
    const patternScore = countPatternMatches(code, langPattern.patterns);
    const keywordScore = countKeywordMatches(code, langPattern.keywords);
    scores[langPattern.language] = (patternScore + keywordScore) * langPattern.weight;
  }

  // TypeScript inherits JavaScript patterns
  if (scores.typescript > 0) {
    scores.typescript += scores.javascript * 0.5;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'unknown';

  const detected = Object.entries(scores).find(([, score]) => score === maxScore);
  return detected ? detected[0] : 'unknown';
}

function getLanguageDisplayName(language) {
  const names = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    unknown: 'Plain Text'
  };
  return names[language] || language;
}

// ============================================
// Syntax Highlighting
// ============================================
const jsKeywords = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'new',
  'class', 'extends', 'import', 'export', 'default', 'async', 'await',
  'true', 'false', 'null', 'undefined', 'this', 'super', 'typeof', 'instanceof',
  'of', 'in', 'do', 'finally', 'yield', 'static', 'get', 'set'
];

const tsKeywords = [
  ...jsKeywords,
  'interface', 'type', 'enum', 'namespace', 'readonly', 'private', 'public',
  'protected', 'implements', 'abstract', 'as', 'is', 'keyof', 'infer',
  'never', 'unknown', 'any', 'void', 'string', 'number', 'boolean', 'object'
];

const pythonKeywords = [
  'def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while',
  'try', 'except', 'finally', 'with', 'as', 'return', 'yield', 'lambda',
  'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'True',
  'False', 'None', 'global', 'nonlocal', 'assert', 'raise', 'del'
];

const cssProperties = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear',
  'width', 'height', 'max-width', 'min-width', 'max-height', 'min-height',
  'margin', 'padding', 'border', 'background', 'color', 'font', 'text',
  'flex', 'grid', 'align', 'justify', 'transform', 'transition', 'animation',
  'opacity', 'visibility', 'overflow', 'z-index', 'cursor', 'box-shadow'
];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightKeywords(code, keywords, className) {
  const pattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  return code.replace(pattern, `<span class="${className}">$1</span>`);
}

function highlightCode(code, language) {
  let highlighted = escapeHtml(code);

  const commonRules = [
    { pattern: /(\/\/[^\n]*)/g, className: 'text-syntax-comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-syntax-comment' },
    { pattern: /("(?:[^"\\]|\\.)*")/g, className: 'text-syntax-string' },
    { pattern: /('(?:[^'\\]|\\.)*')/g, className: 'text-syntax-string' },
    { pattern: /(`(?:[^`\\]|\\.)*`)/g, className: 'text-syntax-string' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-syntax-number' }
  ];

  function applyRules(code, rules) {
    let result = code;
    for (const rule of rules) {
      result = result.replace(rule.pattern, `<span class="${rule.className}">$1</span>`);
    }
    return result;
  }

  switch (language) {
    case 'javascript':
      highlighted = applyRules(highlighted, commonRules);
      highlighted = highlightKeywords(highlighted, jsKeywords, 'text-syntax-keyword');
      highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-syntax-function">$1</span>');
      break;

    case 'typescript':
      highlighted = applyRules(highlighted, commonRules);
      highlighted = highlightKeywords(highlighted, tsKeywords, 'text-syntax-keyword');
      highlighted = highlighted.replace(/:\s*([A-Z]\w*)/g, ': <span class="text-syntax-attribute">$1</span>');
      highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-syntax-function">$1</span>');
      break;

    case 'python':
      highlighted = highlighted.replace(/(#[^\n]*)/g, '<span class="text-syntax-comment">$1</span>');
      highlighted = highlighted.replace(/("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')/g, '<span class="text-syntax-string">$1</span>');
      highlighted = applyRules(highlighted, commonRules.slice(2));
      highlighted = highlightKeywords(highlighted, pythonKeywords, 'text-syntax-keyword');
      highlighted = highlighted.replace(/\bdef\s+([a-zA-Z_]\w*)/g, 'def <span class="text-syntax-function">$1</span>');
      highlighted = highlighted.replace(/\bclass\s+([a-zA-Z_]\w*)/g, 'class <span class="text-syntax-attribute">$1</span>');
      break;

    case 'html':
      highlighted = highlighted.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="text-syntax-tag">$2</span>');
      highlighted = highlighted.replace(/\s([\w-]+)=/g, ' <span class="text-syntax-attribute">$1</span>=');
      highlighted = highlighted.replace(/=(&quot;[^&]*&quot;|'[^']*')/g, '=<span class="text-syntax-string">$1</span>');
      highlighted = highlighted.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-syntax-comment">$1</span>');
      break;

    case 'css':
      highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-syntax-comment">$1</span>');
      highlighted = highlighted.replace(/(^|\n)([\w.#\-\[\]="':,\s]+)(?=\s*\{)/g, '$1<span class="text-syntax-function">$2</span>');
      for (const prop of cssProperties) {
        const regex = new RegExp(`\\b(${prop}[\\w-]*)\\s*:`, 'g');
        highlighted = highlighted.replace(regex, '<span class="text-syntax-keyword">$1</span>:');
      }
      highlighted = highlighted.replace(/:\s*([^;{}]+)(;|(?=\}))/g, ': <span class="text-syntax-string">$1</span>$2');
      break;

    case 'json':
      highlighted = highlighted.replace(/(&quot;)([\w-]+)(&quot;)\s*:/g, '<span class="text-syntax-attribute">$1$2$3</span>:');
      highlighted = highlighted.replace(/:\s*(&quot;[^&]*&quot;)/g, ': <span class="text-syntax-string">$1</span>');
      highlighted = highlighted.replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-syntax-number">$1</span>');
      highlighted = highlighted.replace(/:\s*(true|false|null)/g, ': <span class="text-syntax-keyword">$1</span>');
      break;

    default:
      highlighted = applyRules(highlighted, commonRules);
  }

  return highlighted;
}

// ============================================
// State
// ============================================
let snippets = [];
let selectedSnippetId = null;
let searchQuery = '';
let languageFilter = 'all';
let isPreviewMode = false;
let hasChanges = false;

// Current editor state
let currentName = '';
let currentCode = '';
let currentLanguage = 'unknown';
let currentTags = [];

// ============================================
// DOM Elements
// ============================================
const searchInput = document.getElementById('search-input');
const languageFilterSelect = document.getElementById('language-filter');
const newBtn = document.getElementById('new-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');
const snippetList = document.getElementById('snippet-list');
const sidebarFooter = document.getElementById('sidebar-footer');
const emptyState = document.getElementById('empty-state');
const editorContent = document.getElementById('editor-content');
const snippetNameInput = document.getElementById('snippet-name');
const languageSelect = document.getElementById('language-select');
const detectedLanguageEl = document.getElementById('detected-language');
const detectedBadge = document.getElementById('detected-badge');
const previewToggle = document.getElementById('preview-toggle');
const previewIcon = document.getElementById('preview-icon');
const editIcon = document.getElementById('edit-icon');
const copyBtn = document.getElementById('copy-btn');
const copyIcon = document.getElementById('copy-icon');
const checkIcon = document.getElementById('check-icon');
const deleteBtn = document.getElementById('delete-btn');
const saveBtn = document.getElementById('save-btn');
const tagsContainer = document.getElementById('tags-container');
const tagInput = document.getElementById('tag-input');
const codeTextarea = document.getElementById('code-textarea');
const codePreview = document.getElementById('code-preview');
const lineCount = document.getElementById('line-count');
const charCount = document.getElementById('char-count');
const lastUpdated = document.getElementById('last-updated');
const deleteModal = document.getElementById('delete-modal');
const deleteSnippetName = document.getElementById('delete-snippet-name');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');
const toast = document.getElementById('toast');

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// Render Functions
// ============================================
function getFilteredSnippets() {
  return snippets.filter(snippet => {
    const matchesSearch = searchQuery === '' ||
      snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLanguage = languageFilter === 'all' || snippet.language === languageFilter;

    return matchesSearch && matchesLanguage;
  });
}

function renderSnippetList() {
  const filtered = getFilteredSnippets();
  
  // Update footer
  sidebarFooter.textContent = `${filtered.length} snippet${filtered.length !== 1 ? 's' : ''} • Stored locally`;
  
  // Update export button state
  exportBtn.disabled = snippets.length === 0;

  if (filtered.length === 0) {
    snippetList.innerHTML = `
      <div class="empty-list">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>${searchQuery || languageFilter !== 'all' ? 'No snippets match your filters' : 'No snippets yet'}</p>
        ${!searchQuery && languageFilter === 'all' ? '<button class="btn btn-icon" onclick="createSnippet()">Create your first snippet</button>' : ''}
      </div>
    `;
    return;
  }

  snippetList.innerHTML = filtered.map(snippet => {
    const formattedDate = new Date(snippet.updatedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const previewCode = snippet.code.split('\n').slice(0, 3).join('\n');
    const isSelected = snippet.id === selectedSnippetId;

    return `
      <button class="snippet-card ${isSelected ? 'selected' : ''}" data-id="${snippet.id}">
        <div class="snippet-card-header">
          <div class="snippet-card-title">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="m10 13-2 2 2 2"></path>
              <path d="m14 17 2-2-2-2"></path>
            </svg>
            <span class="snippet-card-name">${escapeHtml(snippet.name)}</span>
          </div>
          <span class="language-badge ${snippet.language}">${getLanguageDisplayName(snippet.language)}</span>
        </div>
        <pre class="snippet-card-preview">${escapeHtml(previewCode)}</pre>
        <div class="snippet-card-meta">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
          </svg>
          <span class="snippet-card-date">${formattedDate}</span>
          ${snippet.tags.length > 0 ? `
            <span class="meta-separator">•</span>
            <div class="snippet-card-tags">
              ${snippet.tags.slice(0, 2).map(tag => `<span class="snippet-card-tag">${escapeHtml(tag)}</span>`).join('')}
              ${snippet.tags.length > 2 ? `<span class="snippet-card-tag">+${snippet.tags.length - 2}</span>` : ''}
            </div>
          ` : ''}
        </div>
      </button>
    `;
  }).join('');

  // Add click listeners
  snippetList.querySelectorAll('.snippet-card').forEach(card => {
    card.addEventListener('click', () => {
      selectSnippet(card.dataset.id);
    });
  });
}

function renderEditor() {
  const snippet = snippets.find(s => s.id === selectedSnippetId);

  if (!snippet) {
    emptyState.style.display = 'flex';
    editorContent.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  editorContent.style.display = 'flex';

  // Update form values
  snippetNameInput.value = currentName;
  languageSelect.value = currentLanguage;
  codeTextarea.value = currentCode;

  // Update detected language indicator
  const detected = detectLanguage(currentCode);
  if (detected !== 'unknown' && detected !== currentLanguage) {
    detectedLanguageEl.style.display = 'flex';
    detectedBadge.innerHTML = `<span class="language-badge language-badge-sm ${detected}">${getLanguageDisplayName(detected)}</span>`;
  } else {
    detectedLanguageEl.style.display = 'none';
  }

  // Render tags
  renderTags();

  // Update preview mode
  if (isPreviewMode) {
    codeTextarea.style.display = 'none';
    codePreview.style.display = 'block';
    renderCodePreview();
    previewIcon.style.display = 'none';
    editIcon.style.display = 'block';
  } else {
    codeTextarea.style.display = 'block';
    codePreview.style.display = 'none';
    previewIcon.style.display = 'block';
    editIcon.style.display = 'none';
  }

  // Update stats
  lineCount.textContent = `${currentCode.split('\n').length} lines`;
  charCount.textContent = `${currentCode.length} characters`;
  lastUpdated.textContent = new Date(snippet.updatedAt).toLocaleString();

  // Update save button
  updateHasChanges();
}

function renderTags() {
  tagsContainer.innerHTML = currentTags.map(tag => `
    <span class="tag">
      ${escapeHtml(tag)}
      <button class="tag-remove" data-tag="${escapeHtml(tag)}">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </button>
    </span>
  `).join('');

  tagsContainer.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTag(btn.dataset.tag);
    });
  });
}

function renderCodePreview() {
  const highlighted = highlightCode(currentCode, currentLanguage);
  const lines = highlighted.split('\n');

  codePreview.innerHTML = `
    <pre><code>${lines.map((line, i) => `
      <div class="code-line">
        <span class="line-number">${i + 1}</span>
        <span class="line-content">${line || '&nbsp;'}</span>
      </div>
    `).join('')}</code></pre>
  `;
}

function updateHasChanges() {
  const snippet = snippets.find(s => s.id === selectedSnippetId);
  if (!snippet) {
    hasChanges = false;
  } else {
    hasChanges =
      currentName !== snippet.name ||
      currentCode !== snippet.code ||
      currentLanguage !== snippet.language ||
      JSON.stringify(currentTags) !== JSON.stringify(snippet.tags);
  }

  saveBtn.disabled = !hasChanges;
  if (hasChanges) {
    saveBtn.classList.add('has-changes');
  } else {
    saveBtn.classList.remove('has-changes');
  }
}

// ============================================
// Snippet Operations
// ============================================
function createSnippet() {
  const now = new Date().toISOString();
  const newSnippet = {
    id: generateId(),
    name: 'Untitled Snippet',
    code: '',
    language: 'unknown',
    detectedLanguage: 'unknown',
    tags: [],
    createdAt: now,
    updatedAt: now
  };

  snippets.unshift(newSnippet);
  saveSnippets(snippets);
  selectSnippet(newSnippet.id);
  renderSnippetList();
  showToast('New snippet created');
}

function selectSnippet(id) {
  selectedSnippetId = id;
  const snippet = snippets.find(s => s.id === id);

  if (snippet) {
    currentName = snippet.name;
    currentCode = snippet.code;
    currentLanguage = snippet.language;
    currentTags = [...snippet.tags];
    isPreviewMode = false;
  }

  renderSnippetList();
  renderEditor();
}

function updateSnippet() {
  const snippet = snippets.find(s => s.id === selectedSnippetId);
  if (!snippet) return;

  snippet.name = currentName;
  snippet.code = currentCode;
  snippet.language = currentLanguage;
  snippet.detectedLanguage = detectLanguage(currentCode);
  snippet.tags = [...currentTags];
  snippet.updatedAt = new Date().toISOString();

  saveSnippets(snippets);
  renderSnippetList();
  renderEditor();
  showToast('Snippet saved');
}

function deleteCurrentSnippet() {
  const index = snippets.findIndex(s => s.id === selectedSnippetId);
  if (index === -1) return;

  snippets.splice(index, 1);
  saveSnippets(snippets);

  if (snippets.length > 0) {
    selectSnippet(snippets[0].id);
  } else {
    selectedSnippetId = null;
    renderEditor();
  }

  renderSnippetList();
  hideDeleteModal();
  showToast('Snippet deleted');
}

function exportSnippets() {
  const data = JSON.stringify(snippets, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `snippets-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Snippets exported');
}

function importSnippetsFromFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const imported = JSON.parse(content);

      if (!Array.isArray(imported)) {
        showToast('Invalid file format: expected an array', 'error');
        return;
      }

      const validSnippets = imported.filter(item =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.code === 'string'
      ).map(item => ({
        id: generateId(),
        name: item.name,
        code: item.code,
        language: item.language || detectLanguage(item.code),
        detectedLanguage: detectLanguage(item.code),
        tags: Array.isArray(item.tags) ? item.tags : [],
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      if (validSnippets.length === 0) {
        showToast('No valid snippets found in file', 'error');
        return;
      }

      snippets = [...validSnippets, ...snippets];
      saveSnippets(snippets);
      selectSnippet(validSnippets[0].id);
      renderSnippetList();
      showToast(`Imported ${validSnippets.length} snippet${validSnippets.length !== 1 ? 's' : ''}`);
    } catch (err) {
      showToast('Failed to parse JSON file', 'error');
    }
  };

  reader.onerror = () => {
    showToast('Failed to read file', 'error');
  };

  reader.readAsText(file);
}

// ============================================
// Tag Operations
// ============================================
function addTag() {
  const trimmed = tagInput.value.trim().toLowerCase();
  if (trimmed && !currentTags.includes(trimmed)) {
    currentTags.push(trimmed);
    tagInput.value = '';
    renderTags();
    updateHasChanges();
  }
}

function removeTag(tag) {
  currentTags = currentTags.filter(t => t !== tag);
  renderTags();
  updateHasChanges();
}

// ============================================
// Modal Operations
// ============================================
function showDeleteModal() {
  const snippet = snippets.find(s => s.id === selectedSnippetId);
  if (snippet) {
    deleteSnippetName.textContent = snippet.name;
    deleteModal.style.display = 'flex';
  }
}

function hideDeleteModal() {
  deleteModal.style.display = 'none';
}

// ============================================
// Copy Operation
// ============================================
async function copyCode() {
  try {
    await navigator.clipboard.writeText(currentCode);
    copyIcon.style.display = 'none';
    checkIcon.style.display = 'block';
    showToast('Copied to clipboard');
    setTimeout(() => {
      copyIcon.style.display = 'block';
      checkIcon.style.display = 'none';
    }, 2000);
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
}

// ============================================
// Event Listeners
// ============================================
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderSnippetList();
});

languageFilterSelect.addEventListener('change', (e) => {
  languageFilter = e.target.value;
  renderSnippetList();
});

newBtn.addEventListener('click', createSnippet);

exportBtn.addEventListener('click', exportSnippets);

importBtn.addEventListener('click', () => {
  importInput.click();
});

importInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importSnippetsFromFile(file);
    importInput.value = '';
  }
});

snippetNameInput.addEventListener('input', (e) => {
  currentName = e.target.value;
  updateHasChanges();
});

languageSelect.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  updateHasChanges();
  renderEditor();
});

codeTextarea.addEventListener('input', (e) => {
  currentCode = e.target.value;
  const detected = detectLanguage(currentCode);
  if (detected !== 'unknown') {
    currentLanguage = detected;
    languageSelect.value = detected;
  }
  updateHasChanges();
  renderEditor();
});

previewToggle.addEventListener('click', () => {
  isPreviewMode = !isPreviewMode;
  renderEditor();
});

copyBtn.addEventListener('click', copyCode);

deleteBtn.addEventListener('click', showDeleteModal);

saveBtn.addEventListener('click', updateSnippet);

tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag();
  }
});

tagInput.addEventListener('blur', addTag);

cancelDelete.addEventListener('click', hideDeleteModal);

confirmDelete.addEventListener('click', deleteCurrentSnippet);

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    hideDeleteModal();
  }
});

// ============================================
// Initialize
// ============================================
function init() {
  snippets = loadSnippets();

  if (snippets.length > 0) {
    selectSnippet(snippets[0].id);
  }

  renderSnippetList();
  renderEditor();
}

init();
