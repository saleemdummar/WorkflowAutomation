export type FormElementType =
    | 'text'
    | 'number'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'email'
    | 'phone'
    | 'file'
    | 'richtext'
    | 'rating'
    | 'signature';

export type FormLayoutType = 'single-column' | 'two-column' | 'grid';

export interface FormLayoutConfig {
    type: FormLayoutType;
    columns?: number;
    rowGap?: number;
    columnGap?: number;
    padding?: number;
    maxWidth?: number;
}

export interface FormElement {
    id: string;
    type: FormElementType;
    label: string;
    fieldName?: string;
    placeholder?: string;
    required: boolean;
    options?: SelectOption[];
    multiple?: boolean;
    validation?: ValidationRules;
    calculation?: CalculationRule;
    style?: ElementStyle;
    conditions?: ConditionGroup;
}

export interface SelectOption {
    Value: string;
    Label: string;
}

export interface ValidationRules {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    minDate?: string;
    maxDate?: string;
    pattern?: string;
    customMessage?: string;
    FileTypes?: string[];
    MaxSize?: number;
}


export interface CalculationRule {
    Expression: string;
    OutputType?: 'number' | 'string' | 'boolean';
}

export interface ElementStyle {
    width?: string;
    height?: string;
    cssClass?: string;
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    columnStart?: number;
    columnSpan?: number;
    rowStart?: number;
    rowSpan?: number;
}

export type ConditionAction = 'show' | 'hide' | 'require' | 'disable' | 'enable' | 'set_value';
export type ConditionElseAction = ConditionAction | 'none';

export interface FieldCondition {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value: string | number | boolean;
    action: ConditionAction;
    elseAction?: ConditionElseAction;
    setValue?: string | number | boolean;
    negate?: boolean;
}

export interface ConditionGroup {
    id: string;
    logic: 'AND' | 'OR' | 'NOT';
    conditions: (FieldCondition | ConditionGroup)[];
}

export interface FormDefinition {
    elements: FormElement[];
    layout: FormLayoutConfig;
}
