export interface ChartDatum { id: string; label?: string; value: number }
export interface SeriesSpec { id: string; name: string; color?: string }
export interface ExportJob { id: string; createdAt: number; status: 'pending' | 'done' | 'error' }
