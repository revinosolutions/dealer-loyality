import { useState, useCallback } from 'react';

interface ValidationRules {
  [key: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
    message?: string;
  };
}

interface FormState<T> {
  values: T;
  errors: { [key: string]: string };
  touched: { [key: string]: boolean };
  isSubmitting: boolean;
}

interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules;
  onSubmit: (values: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useForm<T extends { [key: string]: any }>({
  initialValues,
  validationRules = {},
  onSubmit,
  onSuccess,
  onError,
}: UseFormOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const validateField = useCallback(
    (name: string, value: any) => {
      const rules = validationRules[name];
      if (!rules) return '';

      if (rules.required && !value) {
        return rules.message || `${name} is required`;
      }

      if (rules.minLength && value.length < rules.minLength) {
        return rules.message || `${name} must be at least ${rules.minLength} characters`;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        return rules.message || `${name} must be at most ${rules.maxLength} characters`;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        return rules.message || `${name} is invalid`;
      }

      if (rules.custom && !rules.custom(value)) {
        return rules.message || `${name} is invalid`;
      }

      return '';
    },
    [validationRules]
  );

  const validateForm = useCallback(() => {
    const errors: { [key: string]: string } = {};
    let isValid = true;

    Object.keys(validationRules).forEach((name) => {
      const error = validateField(name, state.values[name]);
      if (error) {
        errors[name] = error;
        isValid = false;
      }
    });

    setState((prev) => ({ ...prev, errors }));
    return isValid;
  }, [state.values, validateField, validationRules]);

  const handleChange = useCallback(
    (name: string, value: any) => {
      setState((prev) => ({
        ...prev,
        values: { ...prev.values, [name]: value },
        touched: { ...prev.touched, [name]: true },
        errors: { ...prev.errors, [name]: validateField(name, value) },
      }));
    },
    [validateField]
  );

  const handleBlur = useCallback(
    (name: string) => {
      setState((prev) => ({
        ...prev,
        touched: { ...prev.touched, [name]: true },
        errors: { ...prev.errors, [name]: validateField(name, prev.values[name]) },
      }));
    },
    [validateField]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (!validateForm()) {
        return;
      }

      setState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        await onSubmit(state.values);
        onSuccess?.();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('An error occurred'));
      } finally {
        setState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [state.values, validateForm, onSubmit, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }, [initialValues]);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}

export default useForm; 