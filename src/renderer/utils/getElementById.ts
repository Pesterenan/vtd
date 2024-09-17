import ErrorElement from '../components/errorElement';

function getElementById<T>(id: string): T {
  const element = document.getElementById(id) as T;
  if (element) {
    return element;
  }
  return ErrorElement(`Não pôde localizar o elemento com id: ${id}`) as T;
}

export default getElementById;
