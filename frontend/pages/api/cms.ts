import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({
        categories: [
            { id: 'football', name: 'كرة القدم', icon: 'BiFootball', color: '#10B981' },
            { id: 'basketball', name: 'كرة السلة', icon: 'BiBasketball', color: '#F59E0B' },
            { id: 'esports', name: 'الرياضات الإلكترونية', icon: 'BiJoystick', color: '#8B5CF6' },
            { id: 'tennis', name: 'تنس', icon: 'BiTennisBall', color: '#EC4899' },
        ]
    });
}
