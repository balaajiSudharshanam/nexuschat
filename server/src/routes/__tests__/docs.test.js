const request = require('supertest');
jest.mock('../../rag/store', () => ({
  listDocs: jest.fn().mockResolvedValue([]),
  deleteDoc: jest.fn(),
}));
const { app } = require('../../app');
const { listDocs, deleteDoc } = require('../../rag/store');
const { setBroadcast } = require('../docs');

describe('GET /api/docs', () => {
  test('returns empty docs array on a fresh server', async () => {
    const res = await request(app).get('/api/docs');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: [] });
  });
});

describe('DELETE /api/docs/:docName', () => {
  beforeEach(() => {
    deleteDoc.mockClear();
  });

  test('returns 200 with deleted docName', async () => {
    const res = await request(app).delete('/api/docs/report.pdf');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: 'report.pdf' });
    expect(deleteDoc).toHaveBeenCalledWith('report.pdf');
  });

  test('calls _broadcast with doc_removed event', async () => {
    const mockBroadcast = jest.fn();
    setBroadcast(mockBroadcast);

    await request(app).delete('/api/docs/report.pdf');

    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'doc_removed', docName: 'report.pdf' });

    // Reset broadcast to no-op so other tests are unaffected
    setBroadcast(() => {});
  });

  test('deleting a nonexistent doc returns 200 gracefully', async () => {
    // deleteDoc is already mocked as jest.fn() which resolves to undefined
    const res = await request(app).delete('/api/docs/nonexistent.pdf');
    expect(res.status).toBe(200);
  });
});
