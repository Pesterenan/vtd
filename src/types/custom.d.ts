declare const APP_VERSION: string;

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

