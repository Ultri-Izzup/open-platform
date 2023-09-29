import fp  from 'fastify-plugin';

const MemberService = (postgres) => {

    console.log('MemberService')

    const getNow = async () => {

        const client = await postgres.connect();

        try {
            const { rows } = await client.query(
                'SELECT CURRENT_TIMESTAMP'
            )
            // Note: avoid doing expensive computation here, this will block releasing the client
            return rows[0]
          } finally {
            // Release the client immediately after query resolves, or upon error
            client.release()
          }

    }

    return { getNow }
}

export default fp((server, options, next) => {
    server.decorate('memberService', MemberService(server.pg))
    next()
})