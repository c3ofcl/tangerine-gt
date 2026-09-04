/**
 * mesh gradient presets
 * 
 * base: the base color of the entire background
 * points: control points for each gradient
 *   - x, y: 0.0 〜 1.0 relative coordinates with top right as the origin)
 *   - r: relative scale of radius
 *   - color: color code
 */

const GRADIENT_PRESETS = {
    'tangerine-classic': {
        name: 'Tangerine Classic',
        base: '#ffa200',
        points: [
            { x: 0.20, y: 0.90, r: 0.90, color: '#ee9905' },
            { x: 0.85, y: 0.85, r: 0.80, color: '#f86f49' }, 
            { x: 0.25, y: 0.25, r: 0.50, color: '#f36d00' },
            { x: 0.55, y: 0.15, r: 0.65, color: '#db1102' },
            { x: 0.95, y: 0.20, r: 0.85, color: '#ba0104' },
            { x: 0.50, y: 1.60, r: 0.80, color: '#ffbc85' },
        ]
    },
};