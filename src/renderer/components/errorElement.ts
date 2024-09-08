function ErrorElement(message: string): HTMLDivElement {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-element';
  errorDiv.textContent = `Erro: ${message}`;
  return errorDiv;
}
export default ErrorElement;
