import { type IPoint } from '../type';

export const getMidPoint = (p1: IPoint, p2: IPoint) => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
};

export const pointAdd = (p1: IPoint, p2: IPoint) => {
  return {
    x: p1.x + p2.x,
    y: p1.y + p2.y,
  };
};

export const isPointEqual = (p1: IPoint, p2: IPoint) =>
  p1.x === p2.x && p1.y === p2.y;

export const distance = (p1: IPoint, p2: IPoint) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const linearInterpolate = (start: IPoint, end: IPoint, t: number) => {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
  };
};
