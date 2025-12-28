// Test: Create single block with functions

export default {
    setup: ({ Block }) => {
        return new Block({
            name: 'test',
            functions: {
                x: 5,
                y: 10,
                sum: ($) => $.x + $.y
            }
        });
    },
    expected: {
        name: 'test',
        variables: ['sum', 'x', 'y'],
        hasX: true,
        hasZ: false,
        inputs: [],
        outputs: []
    },
    validate: (block, expected) => {
        return {
            name: block.name,
            variables: block.getVariables().sort(),
            hasX: block.has('x'),
            hasZ: block.has('z'),
            inputs: block.inputs,
            outputs: block.outputs
        };
    }
};
