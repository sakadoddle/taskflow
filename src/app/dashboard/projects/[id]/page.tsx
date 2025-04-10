'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'TODO',
    dueDate: '',
  });
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState({
    title: '',
    description: '',
  });
  // const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterDueDate, setFilterDueDate] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data.project);
      setEditedProject({
        title: data.project.title,
        description: data.project.description || '',
      });
    } catch (err) {
      setError('Error loading project. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedProject((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      setError('Task title is required');
      return;
    }
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTask,
          projectId: id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      
      // Reset form and fetch updated project
      setNewTask({ title: '', description: '', status: 'TODO', dueDate: '' });
      setShowNewTaskForm(false);
      fetchProject();
    } catch (err) {
      setError('Error creating task. Please try again.');
      console.error(err);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editedProject.title.trim()) {
      setError('Project title is required');
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedProject),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update project');
      }
      
      setEditMode(false);
      fetchProject();
    } catch (err) {
      setError('Error updating project. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      router.push('/dashboard');
    } catch (err) {
      setError('Error deleting project. Please try again.');
      console.error(err);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    try {
      const task = project?.tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...task,
          status: newStatus,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      
      fetchProject();
    } catch (err) {
      setError('Error updating task status. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      fetchProject();
    } catch (err) {
      setError('Error deleting task. Please try again.');
      console.error(err);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !project) return;

    const { source, destination, draggableId } = result;
    
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const task = project.tasks.find(t => t.id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId as 'TODO' | 'IN_PROGRESS' | 'DONE';
    
    const tasksInDestination = project.tasks
      .filter(t => t.status === newStatus)
      .sort((a, b) => a.order - b.order);
    
    let newOrder: number;
    
    if (tasksInDestination.length === 0) {
      newOrder = 0;
    } else if (destination.index === 0) {
      newOrder = tasksInDestination[0].order - 1;
    } else if (destination.index >= tasksInDestination.length) {
      newOrder = tasksInDestination[tasksInDestination.length - 1].order + 1;
    } else {
      const before = tasksInDestination[destination.index - 1].order;
      const after = tasksInDestination[destination.index].order;
      newOrder = (before + after) / 2;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...task,
          status: newStatus,
          order: newOrder,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      fetchProject();
    } catch (err) {
      setError('Error updating task. Please try again.');
      console.error(err);
    }
  };

  const getFilteredTasks = (status: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    if (!project) return [];
    
    return project.tasks
      .filter(task => {
        if (task.status !== status) return false;
        
        if (filterDueDate) {
          if (!task.dueDate) return false;
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          if (filterDueDate === 'today') {
            return dueDate.getTime() === today.getTime();
          } else if (filterDueDate === 'upcoming') {
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return dueDate > today && dueDate <= nextWeek;
          } else if (filterDueDate === 'overdue') {
            return dueDate < today;
          }
        }
        
        return true;
      })
      .sort((a, b) => a.order - b.order);
  };

  if (loading) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-2 text-sm text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">Project not found</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            The project you are looking for does not exist or you do not have access to it.
          </p>
          <div className="mt-4">
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
        <div className="flex-1">
          {editMode ? (
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={editedProject.title}
                  onChange={handleProjectInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Project title"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={editedProject.description}
                  onChange={handleProjectInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Project description (optional)"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              {project.description && (
                <p className="mt-1 max-w-2xl text-sm text-gray-500">{project.description}</p>
              )}
            </>
          )}
        </div>
        <div className="flex space-x-2">
          {!editMode && (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteProject}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Tasks</h2>
          <button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
          >
            {showNewTaskForm ? 'Cancel' : 'Add Task'}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date Filter
            </label>
            <select
              id="dueDate"
              value={filterDueDate || ''}
              onChange={(e) => setFilterDueDate(e.target.value || null)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All</option>
              <option value="today">Due Today</option>
              <option value="upcoming">Due This Week</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          {filterDueDate && (
            <button
              onClick={() => setFilterDueDate(null)}
              className="mt-6 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Filters
            </button>
          )}
        </div>

        {showNewTaskForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={newTask.title}
                  onChange={handleTaskInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={newTask.description}
                  onChange={handleTaskInputChange}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Task description (optional)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    id="status"
                    value={newTask.status}
                    onChange={handleTaskInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    id="dueDate"
                    value={newTask.dueDate}
                    onChange={handleTaskInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Droppable key={"TODO"} droppableId="TODO" isDropDisabled={false} isCombineEnabled={true} ignoreContainerClipping={true}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-50 p-4 rounded-md"
                >
                  <h3 className="font-medium text-gray-900 mb-2">To Do</h3>
                  <div className="space-y-2">
                    {getFilteredTasks('TODO').length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No tasks</p>
                    ) : (
                      getFilteredTasks('TODO').map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-3 rounded shadow-sm"
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-gray-900">{task.title}</h4>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleUpdateTaskStatus(task.id, 'IN_PROGRESS')
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-900"
                                  >
                                    Move →
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeleteTask(task.id)
                                    }}
                                    className="text-xs text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                              )}
                              {task.dueDate && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
            
            <Droppable key={"IN_PROGRESS"} droppableId="IN_PROGRESS" isDropDisabled={false} isCombineEnabled={true} ignoreContainerClipping={true}>
              {(provided) => (
                <div
                  className="bg-gray-50 p-4 rounded-md"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h3 className="font-medium text-gray-900 mb-2">In Progress</h3>
                  <div className="space-y-2">
                    {getFilteredTasks('IN_PROGRESS').length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No tasks</p>
                    ) : (
                      getFilteredTasks('IN_PROGRESS').map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-3 rounded shadow-sm"
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-gray-900">{task.title}</h4>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleUpdateTaskStatus(task.id, 'TODO')
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-900 cursor-pointer"
                                  >
                                    ← Back
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleUpdateTaskStatus(task.id, 'DONE')
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-900 cursor-pointer"
                                  >
                                    Done →
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeleteTask(task.id)
                                    }}
                                    className="text-xs text-red-600 hover:text-red-900 cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                              )}
                              {task.dueDate && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
            
            <Droppable key={"DONE"} droppableId="DONE" isDropDisabled={false} isCombineEnabled={true} ignoreContainerClipping={true}>
              {(provided) => (
                <div
                  className="bg-gray-50 p-4 rounded-md"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h3 className="font-medium text-gray-900 mb-2">Done</h3>
                  <div className="space-y-2">
                    {getFilteredTasks('DONE').length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No tasks</p>
                    ) : (
                      getFilteredTasks('DONE').map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-3 rounded shadow-sm"
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-gray-900 line-through">{task.title}</h4>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleUpdateTaskStatus(task.id, 'IN_PROGRESS')
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-900"
                                  >
                                    ← Back
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeleteTask(task.id)
                                    }}
                                    className="text-xs text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                              )}
                              {task.dueDate && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
