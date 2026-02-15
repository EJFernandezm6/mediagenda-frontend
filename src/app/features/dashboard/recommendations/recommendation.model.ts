export interface Recommendation {
    title: string;
    description: string;
    type: 'OPPORTUNITY' | 'WARNING' | 'INFO';
    metric?: string;
    action?: string;
}
