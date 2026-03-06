import { Parser } from 'expr-eval';

const parser = new Parser({
    operators: {
        in: false,
        assignment: false,
        logical: true,
        comparison: true,
        concatenate: true,
        conditional: true
    }
});

const isSafeIdentifier = (key: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);

export const evaluateExpression = (
    expression: string,
    data: Record<string, unknown>,
    outputType?: 'number' | 'string' | 'boolean'
): { result?: unknown; error?: string } => {
    try {
        const variables: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
            if (isSafeIdentifier(key)) {
                // Convert to number if it's a numeric string for calculations
                if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
                    variables[key] = Number(value);
                } else {
                    variables[key] = value;
                }
            }
        });

        let result: any;
        try {
            result = parser.evaluate(expression, variables as any);
        } catch (error: any) {
            let errorMessage = 'Expression error';
            if (error.message.includes('parse error')) {
                errorMessage = `Invalid expression syntax: ${error.message.split(':')[1]?.trim() || 'Check your expression'}`;
            } else if (error.message.includes('Undefined symbol')) {
                const symbol = error.message.match(/Undefined symbol (.+)/)?.[1];
                errorMessage = `Undefined variable: ${symbol}`;
            } else {
                errorMessage = `Expression error: ${error.message}`;
            }
            return { error: errorMessage };
        }

        let finalResult: any = typeof result === 'number' ? result : result;

        // Enforce output type
        if (outputType) {
            switch (outputType) {
                case 'number':
                    finalResult = Number(finalResult);
                    break;
                case 'string':
                    finalResult = String(finalResult);
                    break;
                case 'boolean':
                    finalResult = Boolean(finalResult);
                    break;
            }
        }

        return { result: finalResult };
    } catch (error: any) {
        console.error('Expression evaluation error:', error);
        return { error: 'Unexpected evaluation error' };
    }
};
