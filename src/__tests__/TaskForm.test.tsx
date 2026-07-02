import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskForm } from '../components/TaskForm';

describe('TaskForm', () => {
	it('renders create mode by default', () => {
		render(<TaskForm onSubmit={vi.fn()} />);
		expect(screen.getByText('Nouvelle tâche')).toBeInTheDocument();
		expect(screen.getByText('Ajouter')).toBeInTheDocument();
	});

	it('renders edit mode', () => {
		render(<TaskForm onSubmit={vi.fn()} mode="edit" initialValues={{ title: 'Test' }} />);
		expect(screen.getByText('Modifier la tâche')).toBeInTheDocument();
		expect(screen.getByText('Modifier')).toBeInTheDocument();
	});

	it('shows validation error when submitting empty title', async () => {
		const user = userEvent.setup();
		render(<TaskForm onSubmit={vi.fn()} />);

		await user.click(screen.getByText('Ajouter'));
		expect(screen.getByRole('alert')).toHaveTextContent('Le titre est requis');
	});

	it('clears validation error when typing', async () => {
		const user = userEvent.setup();
		render(<TaskForm onSubmit={vi.fn()} />);

		await user.click(screen.getByText('Ajouter'));
		expect(screen.getByRole('alert')).toBeInTheDocument();

		await user.type(screen.getByLabelText('Titre'), 'a');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('calls onSubmit with trimmed data', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<TaskForm onSubmit={onSubmit} />);

		await user.type(screen.getByLabelText('Titre'), '  Ma tâche  ');
		await user.type(screen.getByLabelText('Description'), '  Détails  ');
		await user.click(screen.getByText('Ajouter'));

		expect(onSubmit).toHaveBeenCalledWith({
			title: 'Ma tâche',
			description: 'Détails',
		});
	});

	it('sends undefined description when empty', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<TaskForm onSubmit={onSubmit} />);

		await user.type(screen.getByLabelText('Titre'), 'Titre seul');
		await user.click(screen.getByText('Ajouter'));

		expect(onSubmit).toHaveBeenCalledWith({
			title: 'Titre seul',
			description: undefined,
		});
	});

	it('clears fields after submit in create mode', async () => {
		const user = userEvent.setup();
		render(<TaskForm onSubmit={vi.fn()} />);

		await user.type(screen.getByLabelText('Titre'), 'Ma tâche');
		await user.type(screen.getByLabelText('Description'), 'Détails');
		await user.click(screen.getByText('Ajouter'));

		expect(screen.getByLabelText('Titre')).toHaveValue('');
		expect(screen.getByLabelText('Description')).toHaveValue('');
	});

	it('does not clear fields after submit in edit mode', async () => {
		const user = userEvent.setup();
		render(<TaskForm onSubmit={vi.fn()} mode="edit" initialValues={{ title: 'Existant', description: 'Desc' }} />);

		await user.click(screen.getByText('Modifier'));

		expect(screen.getByLabelText('Titre')).toHaveValue('Existant');
	});

	it('renders cancel button when onCancel is provided', () => {
		const onCancel = vi.fn();
		render(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />);
		expect(screen.getByText('Annuler')).toBeInTheDocument();
	});

	it('calls onCancel when cancel button is clicked', async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />);

		await user.click(screen.getByText('Annuler'));
		expect(onCancel).toHaveBeenCalled();
	});

	it('does not render cancel button when onCancel is not provided', () => {
		render(<TaskForm onSubmit={vi.fn()} />);
		expect(screen.queryByText('Annuler')).not.toBeInTheDocument();
	});

	it('populates initial values', () => {
		render(<TaskForm onSubmit={vi.fn()} initialValues={{ title: 'Init', description: 'Desc init' }} />);
		expect(screen.getByLabelText('Titre')).toHaveValue('Init');
		expect(screen.getByLabelText('Description')).toHaveValue('Desc init');
	});
});
