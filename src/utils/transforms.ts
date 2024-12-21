export const toRadians = (angleInDegrees: number): number => {
  return (Math.PI / 180) * angleInDegrees;
};

export const toDegrees = (angleInRadians: number): number => {
  return (angleInRadians * 180) / Math.PI;
};
