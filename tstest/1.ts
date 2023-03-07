import type { Configuration } from '../dist/lib/driver.mjs';
//@ts-ignore
// import { Driver } from '../../../../marcoStayOutPlease/node-nuodb/index.js';
import { Driver } from '../dist/index.js';
import Connection from '../dist/lib/connection.mjs';
import ResultSet from '../dist/lib/resultset.mjs';


// const config: Configuration = {
//     database: `JuicySun@nuosup04`,
//     password: 'star',
//     user: 'dba',
//     // schema: 'SYSTEM',
// };

const config: Configuration = {
    database: `test@nuosup02`,
    password: 'dba',
    user: 'dba',
};


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
            conn.execute('SHOW SCHEMAS;', (err, res) => {
                console.debug('result =>', res);
                res.getRows((err: unknown, rows: any) => {
                    console.debug('rows =>', rows);
                    conn.close();
                })
            })
        })

        // driver = 
        const connection = await driver.connect(config);
        console.debug('initializing connection');

        try {
            console.debug('checking exe =>', typeof connection.execute)
            // const results = await connection.execute('SELECT * FROM SYSTEM.NODES;');
            //@ts-ignore
            const results = await connection.execute('SELECT * FROM SYSTEM.NODES;');

            console.debug('EXPECTING RESULT =>', results);
            //@ts-ignore
            const rows = await results.getRows();
            console.debug(rows)
            // result.getRows((err: any, rows: any) => {
            //     console.debug(rows);

            // });
            //@ts-ignore
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

testConnection();
