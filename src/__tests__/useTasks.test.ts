import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTasks } from '../hooks/useTasks';
import * as taskApi from '../api/taskApi';

vi.mock('../api/taskApi');

const mockTask = {
	id: 1,
	title: 'Test',
	description: null,
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('useTasks', () => {
	it('loads tasks on mount', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);

		const { result } = renderHook(() => useTasks());

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.tasks).toEqual([mockTask]);
		expect(result.current.error).toBeNull();
	});

	it('sets error on load failure', async () => {
		vi.mocked(taskApi.getTasks).mockRejectedValue(new Error('Network error'));

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('Network error');
		expect(result.current.tasks).toEqual([]);
	});

	it('sets generic error for non-Error exceptions', async () => {
		vi.mocked(taskApi.getTasks).mockRejectedValue('string error');

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('Une erreur est survenue');
	});

	it('addTask prepends new task', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
		const newTask = { ...mockTask, id: 2, title: 'New' };
		vi.mocked(taskApi.createTask).mockResolvedValue(newTask);

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.addTask({ title: 'New' });
		});

		expect(result.current.tasks[0]).toEqual(newTask);
		expect(result.current.tasks).toHaveLength(2);
	});

	it('editTask updates the task in the list', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
		const updated = { ...mockTask, title: 'Updated' };
		vi.mocked(taskApi.updateTask).mockResolvedValue(updated);

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.editTask(1, { title: 'Updated' });
		});

		expect(result.current.tasks[0].title).toBe('Updated');
	});

	it('removeTask removes the task from the list', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
		vi.mocked(taskApi.deleteTask).mockResolvedValue(undefined);

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.removeTask(1);
		});

		expect(result.current.tasks).toHaveLength(0);
	});

	it('toggleComplete toggles completion status', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
		const toggled = { ...mockTask, completed: true };
		vi.mocked(taskApi.updateTask).mockResolvedValue(toggled);

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.toggleComplete(1);
		});

		expect(result.current.tasks[0].completed).toBe(true);
		expect(taskApi.updateTask).toHaveBeenCalledWith(1, { completed: true });
	});

	it('toggleComplete does nothing for unknown id', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.toggleComplete(999);
		});

		expect(taskApi.updateTask).not.toHaveBeenCalled();
	});

	it('loadTasks can be called to refresh', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);

		const { result } = renderHook(() => useTasks());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		const updatedList = [mockTask, { ...mockTask, id: 2, title: 'Second' }];
		vi.mocked(taskApi.getTasks).mockResolvedValue(updatedList);

		await act(async () => {
			await result.current.loadTasks();
		});

		expect(result.current.tasks).toHaveLength(2);
	});
});
