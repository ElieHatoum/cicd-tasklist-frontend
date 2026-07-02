import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TaskItem } from '../components/TaskItem';
import type { Task } from '../types/task';

const baseTask: Task = {
	id: 1,
	title: 'Ma tâche',
	description: 'Une description',
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

const onToggle = vi.fn();
const onDelete = vi.fn();
const onEdit = vi.fn();

afterEach(() => {
	vi.useRealTimers();
	vi.clearAllMocks();
});

describe('TaskItem', () => {
	it('renders task title and description', () => {
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);
		expect(screen.getByText('Ma tâche')).toBeInTheDocument();
		expect(screen.getByText('Une description')).toBeInTheDocument();
	});

	it('does not render description when null', () => {
		const task = { ...baseTask, description: null };
		render(<TaskItem task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);
		expect(screen.queryByText('Une description')).not.toBeInTheDocument();
	});

	it('shows completed class when task is completed', () => {
		const task = { ...baseTask, completed: true };
		render(<TaskItem task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);
		expect(screen.getByTestId('task-item')).toHaveClass('task-completed');
	});

	it('calls onToggle when checkbox is clicked', async () => {
		const user = userEvent.setup();
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);

		await user.click(screen.getByRole('checkbox'));
		expect(onToggle).toHaveBeenCalledWith(1);
	});

	it('requires double click to delete', async () => {
		const user = userEvent.setup();
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);

		const deleteBtn = screen.getByLabelText('Supprimer');
		await user.click(deleteBtn);
		expect(onDelete).not.toHaveBeenCalled();

		await user.click(deleteBtn);
		expect(onDelete).toHaveBeenCalledWith(1);
	});

	it('resets confirm delete after timeout', () => {
		vi.useFakeTimers();
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);

		const deleteBtn = screen.getByLabelText('Supprimer');
		fireEvent.click(deleteBtn);
		expect(onDelete).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(3000);
		});

		fireEvent.click(deleteBtn);
		expect(onDelete).not.toHaveBeenCalled();
	});

	it('enters edit mode and saves', async () => {
		const user = userEvent.setup();
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);

		await user.click(screen.getByLabelText('Modifier'));

		const titleInput = screen.getByLabelText('Modifier le titre');
		await user.clear(titleInput);
		await user.type(titleInput, 'Nouveau titre');

		await user.click(screen.getByText('Enregistrer'));
		expect(onEdit).toHaveBeenCalledWith(1, {
			title: 'Nouveau titre',
			description: 'Une description',
		});
	});

	it('does not save when title is empty', async () => {
		const user = userEvent.setup();
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);

		await user.click(screen.getByLabelText('Modifier'));

		const titleInput = screen.getByLabelText('Modifier le titre');
		await user.clear(titleInput);

		await user.click(screen.getByText('Enregistrer'));
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('cancels editing and restores original values', async () => {
		const user = userEvent.setup();
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);

		await user.click(screen.getByLabelText('Modifier'));

		const titleInput = screen.getByLabelText('Modifier le titre');
		await user.clear(titleInput);
		await user.type(titleInput, 'Changé');

		await user.click(screen.getByText('Annuler'));

		expect(screen.getByText('Ma tâche')).toBeInTheDocument();
		expect(screen.queryByLabelText('Modifier le titre')).not.toBeInTheDocument();
	});

	it('formats date in French', () => {
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);
		expect(screen.getByText('15 janvier 2026')).toBeInTheDocument();
	});

	it('sends undefined description when edit description is empty', async () => {
		const user = userEvent.setup();
		const task = { ...baseTask, description: 'old' };
		render(<TaskItem task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />);

		await user.click(screen.getByLabelText('Modifier'));

		const descInput = screen.getByLabelText('Modifier la description');
		await user.clear(descInput);

		await user.click(screen.getByText('Enregistrer'));
		expect(onEdit).toHaveBeenCalledWith(1, {
			title: 'Ma tâche',
			description: undefined,
		});
	});
});
