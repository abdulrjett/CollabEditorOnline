// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-document', (documentId) => {
    socket.join(documentId);
  });

  socket.on('document-update', async (data) => {
    try {
      const { documentId, content } = data;
      const document = await Document.findById(documentId);
      
      if (document) {
        document.content = content;
        document.lastModified = new Date();
        await document.save();
        
        io.to(documentId).emit('document-update', document);
      }
    } catch (error) {
      console.error('Error updating document:', error);
    }
  });

  socket.on('line-locked', (data) => {
    const { documentId, lineNumber, lockedBy } = data;
    io.to(documentId).emit('line-locked', { documentId, lock: { lineNumber, lockedBy } });
  });

  socket.on('line-unlocked', (data) => {
    const { documentId, lineNumber } = data;
    io.to(documentId).emit('line-unlocked', { documentId, lineNumber });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
}); 