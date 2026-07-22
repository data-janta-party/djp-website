import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card';

const meta = {
  title: 'UI/Atoms/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-sm">
      <CardHeader>
        <CardTitle>data.janta.party</CardTitle>
        <CardDescription>Next.js, shadcn, Cloudflare Workers</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge>Demo</Badge>
      </CardContent>
      <CardFooter>
        <Button>Explore</Button>
      </CardFooter>
    </Card>
  ),
};