// Function to highlight the syntax of AI-generated code
function highlightAICode() {
  const aiGeneratedMessages = document.querySelectorAll('.ai-generated');

  aiGeneratedMessages.forEach((message) => {
    const codeElements = message.querySelectorAll('code');

    codeElements.forEach((codeElement) => {
      const language = codeElement.getAttribute('data-language') || 'plaintext';

      // Use the appropriate syntax highlighter based on the language
      switch (language) {
        case 'javascript':
        case 'js':
          hljs.highlightElement(codeElement, { language: 'javascript' });
          break;
        case 'python':
          hljs.highlightElement(codeElement, { language: 'python' });
          break;
        case 'java':
          hljs.highlightElement(codeElement, { language: 'java' });
          break;
        case 'csharp':
        case 'cs':
          hljs.highlightElement(codeElement, { language: 'csharp' });
          break;
        case 'ruby':
          hljs.highlightElement(codeElement, { language: 'ruby' });
          break;
        case 'php':
          hljs.highlightElement(codeElement, { language: 'php' });
          break;
        case 'go':
          hljs.highlightElement(codeElement, { language: 'go' });
          break;
        case 'rust':
          hljs.highlightElement(codeElement, { language: 'rust' });
          break;
        case 'swift':
          hljs.highlightElement(codeElement, { language: 'swift' });
          break;
        case 'kotlin':
          hljs.highlightElement(codeElement, { language: 'kotlin' });
          break;
        default:
          hljs.highlightElement(codeElement);
          break;
      }
    });
  });
}

// Call the highlightAICode function when the page loads
window.addEventListener('DOMContentLoaded', highlightAICode);