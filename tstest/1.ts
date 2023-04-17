import type { Configuration } from '../dist/lib/driver';
//@ts-ignore
// import { Driver } from '../../../../marcoStayOutPlease/node-nuodb/index.js';
import { Driver, Connection, ResultSet } from '../dist/';
import { Rows } from '../dist/lib/resultset';


// const config: Configuration = {
//     database: `JuicySun@nuosup04`,
//     password: 'star',
//     user: 'dba',
//     // schema: 'SYSTEM',
// };

const config = {
    database: `test1@nuosup02`,
    password: 'dba',
    user: 'dba',
};

// import { Driver } from 'node-nuodb';
// import type { Connection, ResultSet, Rows } from 'node-nuodb';

(() => {
    const driver = new Driver();
    (async () => {
        const conn: Connection = await driver.connect(config);
        const results: ResultSet|undefined = await conn.execute('SELECT * FROM SYSTEM.NODES;');
        const rows: Rows|undefined = await results?.getRows();
        console.log('This is the result of the query =>', rows);
    })()
})()

function otherTest() {
    (async () => {
        const driver = new Driver();
        const nuodb = await driver.connect({
            database: 'test',
            user: 'dba',
            password: 'dba'
        });
        const results = await nuodb.execute(`use system;`);
        if (!!results) {
            const rows = await results.getRows();
            console.debug('ROWS =>', rows);
            await nuodb.close();
        }
    })()
}
// otherTest();

function testConnection() {
    async function test() {
        let driver = new Driver();
        console.debug('initializing the driver');
        driver.connect(config)
        // .then(async (conn: Connection) => { 
        //     console.debug('cndkjsnd!', conn);
        //     const res = await conn.execute('SELECT * FROM SYSTEM.NODES;');
        //     console.debug('pojwej!', conn, res);
        //     conn.close();
        //     })
        // .catch((err: Error) => { console.error('ERRORRRRR', err)});

        driver.connect(config, (err: unknown, conn: Connection) => {
            console.debug('THE CONNECTION =>', conn);
            // conn.execute('test', {queryTimeout: 1});
            conn.execute('SHOW SCHEMAS;', (err: unknown, res: any) => {
                console.debug('result =>', res);
                res.getRows((err: unknown, rows: any) => {
                    console.debug('rows =>', rows);
                    conn.close();
                })
            })
        })

        const connection = await driver.connect(config);
        console.debug('initializing connection');

        try {
            console.debug('checking exe =>', typeof connection.execute)
            const results = await connection.execute('SELECT * FROM SYSTEM.NODES;');
            console.debug('EXPECTING RESULT =>', results);
            const rows = await results?.getRows();
            console.debug(rows)
            // result.getRows((err: any, rows: any) => {
            //     console.debug(rows);

            // });
            await connection.close();

            // });
            // const rows = await results?.getRows();
            // console.debug('NuoSQL return =>', rows);
            
            // resolve(rows);
        } catch (err) {
            console.error('SOMETHING WENT WRONG =>', err)
            // reject(err);
        } finally {
            return
            // await connection.close();
        }
    }
    test();
}

// testConnection();
