const { GraphQLClient } = require('graphql-request')
const cheerio = require('cheerio')
const moment = require('moment')
const express = require('express')
const rp = require('request-promise')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
const domain_url = 'https://www.kbb.com/owners-argo/api'
const vehicle_class = 'UsedCar'
const user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36'

const client = new GraphQLClient(domain_url, {
    proxy: 'https://45.33.59.15:3128',
    headers: {
        'User-Agent': user_agent,
        proxy: 'https://45.33.59.15:3128',
    }
})
const cors_options = {
    origin: ['null', 'https://loans.avalltex.com'],
    method: ['GET', 'POST'],
    optionsSuccessStatus: 200
}

app.use(cors(cors_options))
app.use( bodyParser.json() )       // para soportar json = JSON-encoded
app.use(bodyParser.urlencoded({     // para soportar parametros codificados en url URL-encoded
  extended: true
}))

const http = require('http')

/**
* getYears
* @param { req } expressRequest Data request
* @param { res } expressResponse Instance express response
* @description Funcion para responder el listado de años disponibles
* @author Miguel Garces
*/

var getYears = async (req, res) => {
    console.error('Entra 2')
    let query = `
        query yearsQuery($vehicleClass: String!){
            years(vehicleClass: $vehicleClass){
                id
                name: id
            }
        }
    `
    let variables = {
        vehicleClass: vehicle_class
    }
    try {
        console.error('Lanza peticion')

        let result = await client.request(query, variables)
        console.error('Respuesta', result)
        return res.json({status: 1, items: result.years, total_count: result.years.length})
    } catch (error) {
        console.error('Error al consultar years', error)
        return res.json({status: 0, mensaje: error.message})
    }
}
/**
* getMakesByYears
* @param { req } expressRequest Data request
* @param { res } expressResponse Instance express response
* @description Funcion para responder el listado de fabricantes disponibles por año seleccionado
* @author Miguel Garces
*/
var getMakesByYears = async (req, res) => {
    let query = `
        query makesQuery($vehicleClass: String, $yearId: String){
            makes(vehicleClass: $vehicleClass, yearId: $yearId){
                id
                name
            }
        }
    `
    let variables = {
        vehicleClass: vehicle_class,
        yearId: (!isVacio(req.query) && !isVacio(req.query.year)) ? req.query.year : moment().format('YYYY')
    }

    try {
        let result = await client.request(query, variables)
        return res.json({status: 1, items: result.makes, total_count: result.makes.length})
    } catch (error) {
        console.error('Error al consultar makes', error)
        return res.json({status: 0, mensaje: error.message})
    }
}

/**
* getModelsByMakers
* @param { req } expressRequest Data request
* @param { res } expressResponse Instance express response
* @description Funcion para responder el listado de modelos por fabricante
* @author Miguel Garces
*/
var getModelsByMakers = async (req, res) => {
    let query = `
        query modelsQuery($vehicleClass: String, $yearId: String, $make: String!){
            models(vehicleClass: $vehicleClass, yearId: $yearId, makeId: $make){
                id
                name
            }
        }
    `
    let variables = {
        vehicleClass: vehicle_class,
        yearId: (!isVacio(req.query) && !isVacio(req.query.year)) ? req.query.year : moment().format('YYYY'),
        make: req.query.make_id
    }

    try {
        let result = await client.request(query, variables)
        return res.json({status: 1, items: result.models, total_count: result.models.length})
    } catch (error) {
        console.error('Error al consultar modelos', error)
        return res.json({status: 0, mensaje: error.message})
    }
}

/**
* postMyCarValue
* @param { req } expressRequest Data request
* @param { res } expressResponse Instance express response
* @description Funcion para obtener el estilo y colores del vehiculo
* @author Miguel Garces
*/
var postMyCarValue = async (req, res) => {
    let query = `
        query stylesPageQuery($year: String!, $make: String, $model: String, $vehicleClass: String!){
            ymm: stylesPage(vehicleClass: $vehicleClass, year: $year, make: $make, model: $model){
                year
                make{
                    id
                    name
                }
                model{
                    id
                    name
                }
                bodyStyles{
                    name
                    trims{
                        id
                        name
                        vehicleId
                        __typename
                    }
                    defaultVehicleId
                    __typename
                }
                typicalMileage
                defaultVehicleId
                __typename
            }
        }
    `
    let variables = {
        vehicleClass: vehicle_class,
        year: (!isVacio(req.body) && !isVacio(req.body.year)) ? req.body.year : moment().format('YYYY'),
        make: req.body.make_text.toLowerCase().trim().replace(/ /g, '-'),
        model: req.body.model_text.toLowerCase().trim().replace(/ /g, '-')
    }

    try {
        let result = await client.request(query, variables)
        let default_value = null
        if(result.ymm.defaultVehicleId == '0'){
            default_value = result.ymm.bodyStyles[0].trims[0]
        }
        return res.json({status: 1, result: result.ymm, default_value: default_value})
    } catch (error) {
        console.error('Error al consultar postMyCarValue', error)
        return res.json({status: 0, mensaje: error.message})
    }
}
 
/**
* getOptionsEquipementCar
* @param { req } expressRequest Data request
* @param { res } expressResponse Instance express response
* @description Funcion para obtener las opciones de equipamiento del vehiculo
* @author Miguel Garces
*/
var getOptionsEquipementCar = async (req, res) => {
    let query = `
        query optionsPageQuery($year: String!, $make: String, $model: String, $trim: String, $vehicleId: String, $vehicleClass: String!, $initialOptions: String!){
            ymmt: optionsPage(vehicleClass: $vehicleClass, year: $year, make: $make, model: $model, trim: $trim, vehicleId: $vehicleId){
                vehicleId
                year
                make{
                    id
                    name
                }
                model{
                    id
                    name
                }
                trim{
                    id
                    name
                    __typename
                }
                showCategoryStyleLink
                typicalMileage
                selectedOptions(initialOptions: $initialOptions){
                    groups{
                        name
                        sections{
                            optionSectionName
                            required
                            options{
                                vehicleOptionId
                                optionType
                                optionName
                                categoryName
                                categoryGroup
                                sortOrder
                                isConsumer
                                isTypical
                                isSelected
                                isConfigurable
                                hasRelationships
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                    colors{
                        vehicleOptionId
                        optionType
                        optionName
                        categoryName
                        categoryGroup
                        sortOrder
                        isConsumer
                        isTypical
                        isSelected
                        isConfigurable
                        hasRelationships
                        imageUrl
                        __typename
                    }
                    vrsSelectedOptions{
                        vehicleOptionId
                        optionType
                        optionName
                        categoryName
                        categoryGroup
                        sortOrder
                        isConsumer
                        isTypical
                        isSelected
                        isConfigurable
                        hasRelationships
                        __typename
                    }
                    __typename
                }
                __typename
            }
        }
    `
    let variables = {
        vehicleClass: vehicle_class,
        year: (!isVacio(req.body) && !isVacio(req.body.year)) ? req.body.year : moment().format('YYYY'),
        make: req.body.make_text.toLowerCase().trim().replace(/ /g, '-'),
        model: req.body.model_text.toLowerCase().trim().replace(/ /g, '-'),
        trim: req.body.trim_value.toLowerCase().trim().replace(/ /g, '-'),
        vehicleId: req.body.vehicle_id,
        initialOptions: ''
    }
    let conditions = [
        {
            name: 'Fair',
            value: 'fair',
            porcentaje: '18%',
            description: 'Has some cosmetic defects that require repairing and/or replacing'
        },
        {
            name: 'Good',
            value: 'good',
            porcentaje: '54%',
            description: 'Has some repairable cosmetic defects and is free of major mechanical problems'
        },
        {
            name: 'Very Good',
            value: 'very-good',
            porcentaje: '23%',
            description: 'Has minor cosmetic defects and is in excellent mechanical condition'
        }, 
        {
            name: 'Excellent',
            value: 'excellent',
            porcentaje: '3%',
            description: 'Looks new and is in excellent mechanical condition'
        },  
    ]

    try {
        let result = await client.request(query, variables)
        return res.json({status: 1, result: result.ymmt, conditions: conditions})
    } catch (error) {
        console.error('Error al consultar getOptionsEquipementCar', error)
        return res.json({status: 0, mensaje: error.message})
    }
}

/**
* getInfoSVG
* @param { req } expressRequest Data request
* @param { res } expressResponse Instance express response
* @description Funcion para obtener los valores del info svg
* @author Miguel Garces
*/
var getInfoSVG = async (req, res) => {
    // 8836753|true|8836739|true|8836749|true|8836747|true|8836726|true|8836746|true|8836733|true
    // excellent
    let params = {
        zipcode: req.body.zipcode,
        vehicle_id: req.body.vehicle_id,
        selected_options: req.body.selected_options,
        condition: req.body.condition,
        mileage: req.body.mileage,
        lang: (!isVacio(req.body) && !isVacio(req.body.lang)) ? req.body.lang : 'en'
    }
    let options = {
        method: 'GET',
        headers: {
            'User-Agent': user_agent
        },
        uri: 'https://www.kbb.com/Api/3.9.628.0/2020172/vehicle/upa/PriceAdvisor/meter.svg?action=Get&intent=trade-in-sell&pricetype=FPP&zipcode='+params.zipcode+'&vehicleid='+params.vehicle_id+'&selectedoptions='+params.selected_options+'&hideMonthlyPayment=False&condition='+params.condition+'&mileage='+params.mileage,
        transform: (body, response, resolveWithFullResponse) => {
            // FIXME: The content type string could contain additional values like the charset.
            // Consider using the `content-type` library for a robust comparison.
            if(response.headers['content-type'] === 'application/json') {
                return JSON.parse(body)
            }else{
                return cheerio.load(body)
            }
        }
    }
     
    rp(options).then(($) => {
        if($("g#RangeBox").length > 0){
            let color = $("g#RangeBox > path").eq(0).attr('fill')
            let value_range = $("g#RangeBox > text").eq(1).text()
            let value = $("g#RangeBox > text").eq(3).text()
            return res.json({status: 1, value_range: value_range, value: value, color: color})
        }
        let mensaje = '<b>Info Currently Unavailable</b><span>Avalltex Loans cannot display this graphic. Please check back soon.</span>'
        if(params.lang == 'es'){
            mensaje = '<b>Información actualmente no disponible</b><span>Avalltex Loans no puede mostrar el resultado en este momento. Por favor, intenta mas tarde.</span>'
        }
        return res.json({status: 0, mensaje: mensaje})
    }).catch((err) => {
        console.error("Error en parseo svg", err);
        return res.json({status: 0, mensaje: error.message})
    })
}

app.get('/', (req, res) => {
    getYears(req, res)
    return res.json({status: 4});
}) 
app.get('/get-years', getYears)
app.get('/get-makes-by-years', getMakesByYears)
app.get('/get-models-by-makes', getModelsByMakers)
app.post('/post-my-car-value', postMyCarValue)
app.post('/get-options-equipement', getOptionsEquipementCar)
app.post('/get-info-svg', getInfoSVG)

// ---- Funciones basicas ------
function iniciarServer(){
	let memory = Number(process.memoryUsage().heapTotal) / 1048576
	let port = process.env.SERVER_PORT || 10555
	let interfaces = 'localhost'
	console.log('id del proceso: ', process.pid)
	console.log('título del proceso: ', process.title)
	console.log('versión de node: ', process.version)
	console.log('sistema operativo: ', process.platform)
	console.log("ip" , interfaces)
	console.log("puerto" , port)
	console.log('memoria: ' , memory)
	/*http.listen(port , interfaces , () => {
		console.log("Servidor listo para iniciar")
    })*/
    http.createServer(app).listen(port);
    getYears();
    //app.listen(port)
}

function isVacio(val){
    return (val == '' || val == undefined || val == null || val == ' ')
}

function timeout(ms){
    return new Promise(resolve => setTimeout(resolve, ms))
}

iniciarServer()