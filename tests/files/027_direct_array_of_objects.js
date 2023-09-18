
export default {
    obj: {
        data: { 
            'one': { points: [1,2,3,4,5] },
            'two': { points: [4,5,6,7,8] }
        },
        a: 0, b: 5,
        names: ['one'],
        charts: ($) => $.names.map( name => ({
            dataset: name,
            points: $.data[name].points,
            values: $.data[name].points.filter(p => $.a < p && p < $.b)
        }))
    },
    fn: ($) => {
    },
    _: {
        fn: [ 'charts' ],
        subs: [],
        deps: { 
            charts: { names: true, data: true, a: true, b: true }, 
        },
        value: { 
            data: {
                'one': { points: [1,2,3,4,5] },
                'two': { points: [4,5,6,7,8] }
            },
            a: 0,
            b: 5,
            names: ['one'],
            charts: [
                {
                    dataset: 'one',
                    points: [1,2,3,4,5],
                    values: [1,2,3,4]
                }
            ]
        },
        fatal: {}
    }
}