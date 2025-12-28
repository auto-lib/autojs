// Test: Block with declared inputs/outputs

export default {
    setup: ({ Block }) => {
        return new Block({
            name: 'processor',
            inputs: ['data'],
            outputs: ['result'],
            functions: {
                data: null,
                result: ($) => $.data * 2
            }
        });
    },
    expected: {
        name: 'processor',
        inputs: ['data'],
        outputs: ['result'],
        variables: ['data', 'result']
    },
    validate: (block, expected) => {
        return {
            name: block.name,
            inputs: block.inputs,
            outputs: block.outputs,
            variables: block.getVariables().sort()
        };
    }
};
