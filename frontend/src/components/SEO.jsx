import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

// Título y descripción propios por página, para que Google y las vistas
// previas de WhatsApp/redes sociales muestren algo específico en vez del
// mismo título genérico en todo el sitio.
function SEO({ title, description, image }) {
    const fullTitle = title ? `${title} | Tecnia Academy` : 'Tecnia Academy - Cursos Online en Paraguay';
    const desc = description || 'Aprendé a tu ritmo con cursos online de programación, diseño, negocios y más, dictados por instructores expertos en Tecnia Academy.';

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={desc} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:type" content="website" />
            {image && <meta property="og:image" content={image} />}
        </Helmet>
    );
}

SEO.propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
};

export default SEO;
