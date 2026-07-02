import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as taskApi from '../api/taskApi';

vi.mock('../api/taskApi');

const mockTask = {
	id: 1,
	title: 'Test task',
	description: 'A description',
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('App', () => {
	it('renders header and form', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);

		render(<App />);

		expect(screen.getByText('Mes Tâches')).toBeInTheDocument();
		expect(screen.getByTestId('task-form')).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByTestId('empty')).toBeInTheDocument();
		});
	});

	it('renders tasks and stats when tasks exist', async () => {
		const completedTask = { ...mockTask, id: 2, title: 'Done', completed: true };
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask, completedTask]);

		render(<App />);

		await waitFor(() => {
			expect(screen.getByText('Test task')).toBeInTheDocument();
		});

		expect(screen.getByText('Total')).toBeInTheDocument();
		expect(screen.getByText('Terminées')).toBeInTheDocument();
		expect(screen.getByText('En cours')).toBeInTheDocument();
		const statValues = screen.getAllByText(/^[0-2]$/);
		expect(statValues).toHaveLength(3);
	});

	it('does not show stats when no tasks', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);

		render(<App />);

		await waitFor(() => {
			expect(screen.getByTestId('empty')).toBeInTheDocument();
		});

		expect(screen.queryByText('Total')).not.toBeInTheDocument();
	});

	it('adds a task via the form', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);
		vi.mocked(taskApi.createTask).mockResolvedValue(mockTask);

		const user = userEvent.setup();
		render(<App />);

		await waitFor(() => {
			expect(screen.getByTestId('empty')).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText('Titre'), 'Test task');
		await user.click(screen.getByText('Ajouter'));

		await waitFor(() => {
			expect(screen.getByText('Test task')).toBeInTheDocument();
		});
	});

	it('handles addTask error gracefully', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);
		vi.mocked(taskApi.createTask).mockRejectedValue(new Error('fail'));

		const user = userEvent.setup();
		render(<App />);

		await waitFor(() => {
			expect(screen.getByTestId('empty')).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText('Titre'), 'Test');
		await user.click(screen.getByText('Ajouter'));

		expect(screen.getByTestId('empty')).toBeInTheDocument();
	});
});
