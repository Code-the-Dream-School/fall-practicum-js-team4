import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoUpload } from './PhotoUpload';

describe('PhotoUpload', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(
      (file: File) => `blob:mock-url/${file.name}`,
    );
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('renders telemetry header, upload dropzone, format badges, and photo count', () => {
    render(<PhotoUpload photos={[]} onChange={vi.fn()} />);

    expect(
      screen.getByText(/02 \/\/ VISUAL IDENTITY TELEMETRY/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 5 photos/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /drag and drop pet photographs here, or browse computer/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('JPG')).toBeInTheDocument();
    expect(screen.getByText('WEBP')).toBeInTheDocument();
  });

  it('allows selecting valid photo files through the file input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PhotoUpload photos={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/upload pet photos/i);
    const validFile = new File(['dog image'], 'golden.jpg', {
      type: 'image/jpeg',
    });

    await user.upload(input, validFile);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([validFile]);
  });

  it('displays thumbnails, PRIMARY badge on first photo, and "+ Add Distinct Marking" slot', () => {
    const photo1 = new File(['pic1'], 'milo-front.jpg', {
      type: 'image/jpeg',
      lastModified: 1000,
    });
    const photo2 = new File(['pic2'], 'milo-side.png', {
      type: 'image/png',
      lastModified: 2000,
    });

    render(<PhotoUpload photos={[photo1, photo2]} onChange={vi.fn()} />);

    expect(screen.getByText(/2 \/ 5 photos/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Indexed Image Assets \(2 Loaded\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('★ PRIMARY')).toBeInTheDocument();
    expect(screen.getByText('milo-front.jpg')).toBeInTheDocument();
    expect(screen.getByText('milo-side.png')).toBeInTheDocument();
    expect(screen.getByAltText('Uploaded pet preview 1')).toHaveAttribute(
      'src',
      'blob:mock-url/milo-front.jpg',
    );
    expect(screen.getByAltText('Uploaded pet preview 2')).toHaveAttribute(
      'src',
      'blob:mock-url/milo-side.png',
    );
    expect(
      screen.getByRole('button', { name: /\+ Add Distinct Marking/i }),
    ).toBeInTheDocument();
  });

  it('allows removing an individual photo and revokes its preview URL', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const photo1 = new File(['pic1'], 'dog.jpg', {
      type: 'image/jpeg',
      lastModified: 1000,
    });
    const photo2 = new File(['pic2'], 'cat.png', {
      type: 'image/png',
      lastModified: 2000,
    });

    const { rerender } = render(
      <PhotoUpload photos={[photo1, photo2]} onChange={onChange} />,
    );

    const removeBtn = screen.getByRole('button', { name: 'Remove photo 1' });
    await user.click(removeBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([photo2]);

    rerender(<PhotoUpload photos={[photo2]} onChange={onChange} />);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:mock-url/dog.jpg',
    );
  });

  it('shows validation error when selecting an unsupported file format', () => {
    const onChange = vi.fn();

    render(<PhotoUpload photos={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/upload pet photos/i);
    const invalidFile = new File(['gif content'], 'funny.gif', {
      type: 'image/gif',
    });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /has an unsupported format. Only JPEG, PNG, and WebP are allowed/i,
    );
  });

  it('shows validation error when file exceeds 5MB', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PhotoUpload photos={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/upload pet photos/i);
    const bigBuffer = new Uint8Array(6 * 1024 * 1024);
    const bigFile = new File([bigBuffer], 'huge.jpg', { type: 'image/jpeg' });

    await user.upload(input, bigFile);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/is larger than 5 MB/i);
  });

  it('prevents adding photos when maximum 5 limit is reached', () => {
    const fivePhotos = [1, 2, 3, 4, 5].map(
      (n) =>
        new File([`img${n}`], `photo${n}.jpg`, {
          type: 'image/jpeg',
          lastModified: n * 1000,
        }),
    );

    render(<PhotoUpload photos={fivePhotos} onChange={vi.fn()} />);

    expect(screen.getByText(/5 \/ 5 photos/i)).toBeInTheDocument();
    expect(
      screen.getByText('Maximum photo limit reached (5 photos)'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /\+ Add Distinct Marking/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/upload pet photos/i)).toBeDisabled();
  });

  it('handles drag and drop upload interaction', () => {
    const onChange = vi.fn();
    render(<PhotoUpload photos={[]} onChange={onChange} />);

    const dropZone = screen.getByRole('button', {
      name: /drag and drop pet photographs here, or browse computer/i,
    });
    const file = new File(['content'], 'dropped.jpg', { type: 'image/jpeg' });

    fireEvent.dragOver(dropZone);
    expect(screen.getByText('Drop photos here')).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(
      screen.getByText(/Drag & drop pet photographs here/i),
    ).toBeInTheDocument();

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([file]);
  });

  it('renders external server error message when passed', () => {
    render(
      <PhotoUpload
        photos={[]}
        onChange={vi.fn()}
        error="Server failed to upload photo to cloud storage"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Server failed to upload photo to cloud storage',
    );
  });

  it('opens file picker on Enter, Space, or clicking the dropzone', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload photos={[]} onChange={vi.fn()} />);

    const dropZone = screen.getByRole('button', {
      name: /drag and drop pet photographs here, or browse computer/i,
    });
    const input = screen.getByLabelText(/upload pet photos/i);
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(dropZone);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(dropZone, { key: 'Enter', code: 'Enter' });
    expect(clickSpy).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(dropZone, { key: ' ', code: 'Space' });
    expect(clickSpy).toHaveBeenCalledTimes(3);
  });

  it('rejects duplicate files when the same photo is selected again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const existing = new File(['dog image'], 'golden.jpg', {
      type: 'image/jpeg',
      lastModified: 1000,
    });
    const duplicate = new File(['dog image'], 'golden.jpg', {
      type: 'image/jpeg',
      lastModified: 1000,
    });

    render(<PhotoUpload photos={[existing]} onChange={onChange} />);

    const input = screen.getByLabelText(/upload pet photos/i);
    await user.upload(input, duplicate);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '"golden.jpg" has already been added.',
    );
  });
});
