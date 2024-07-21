import { VercelRequest, VercelResponse } from '@vercel/node';

export default (req: VercelRequest, res: VercelResponse): void => {
  res.send('Hello world!');
};